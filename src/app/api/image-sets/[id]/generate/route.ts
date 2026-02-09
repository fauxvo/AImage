import { db } from "@/db";
import { imageSets, generatedImages } from "@/db/schema";
import { openai } from "@/lib/openai";
import { ensureImageSetDir } from "@/lib/paths";
import { buildStyledPrompt } from "@/lib/validations";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const imageSet = await db
    .select()
    .from(imageSets)
    .where(eq(imageSets.id, id))
    .get();

  if (!imageSet) {
    return new Response("Not found", { status: 404 });
  }

  const basePrompt = imageSet.refinedPrompt || imageSet.prompt;
  if (!basePrompt) {
    return new Response("No prompt set", { status: 400 });
  }
  const prompt = buildStyledPrompt(basePrompt, imageSet.style);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send("started", {
          imageSetId: id,
          numImages: imageSet.numImages,
        });

        const dir = ensureImageSetDir(id);
        const newImages: Array<{ id: string; fileName: string; filePath: string }> = [];

        for (let i = 0; i < imageSet.numImages; i++) {
          send("progress", {
            current: i + 1,
            total: imageSet.numImages,
            status: `Generating image ${i + 1} of ${imageSet.numImages}...`,
          });

          const response = await openai.images.generate({
            model: "gpt-image-1",
            prompt,
            n: 1,
            size: imageSet.size as "1024x1024" | "1024x1536" | "1536x1024",
            quality: imageSet.quality as "auto" | "low" | "medium" | "high",
          });

          const imageData = response.data?.[0];
          if (!imageData?.b64_json) {
            send("error", { message: `No image data returned for image ${i + 1}` });
            continue;
          }

          const timestamp = Date.now();
          const fileName = `${timestamp}-${i}.png`;
          const filePath = path.join(dir, fileName);
          const buffer = Buffer.from(imageData.b64_json, "base64");
          fs.writeFileSync(filePath, buffer);

          const imageId = crypto.randomUUID();
          await db.insert(generatedImages).values({
            id: imageId,
            imageSetId: id,
            filePath,
            fileName,
            createdAt: timestamp,
          });

          newImages.push({ id: imageId, fileName, filePath });

          send("image_saved", {
            current: i + 1,
            total: imageSet.numImages,
            image: { id: imageId, fileName },
          });
        }

        // Update the imageSet's updatedAt
        await db
          .update(imageSets)
          .set({ updatedAt: Date.now() })
          .where(eq(imageSets.id, id));

        send("complete", { images: newImages });
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
