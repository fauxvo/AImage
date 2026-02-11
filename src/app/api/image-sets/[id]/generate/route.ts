import { db } from "@/db";
import { imageSets, generatedImages, referenceImages } from "@/db/schema";
import { getOpenAIClient } from "@/lib/openai";
import { getSetting, SETTINGS_KEYS, DEFAULT_IMAGE_MODEL } from "@/lib/settings";
import { optimizeImage } from "@/lib/optimize";
import { ensureImageSetDir } from "@/lib/paths";
import {
  buildStyledPrompt,
  type SSEStarted,
  type SSEProgress,
  type SSEImageSaved,
  type SSEWarning,
  type SSEError,
  type SSEComplete,
} from "@/lib/validations";
import { eq } from "drizzle-orm";
import { toFile } from "openai";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imageSet = await db.select().from(imageSets).where(eq(imageSets.id, id)).get();

  if (!imageSet) {
    return new Response("Not found", { status: 404 });
  }

  const basePrompt = imageSet.refinedPrompt || imageSet.prompt;
  if (!basePrompt) {
    return new Response("No prompt set", { status: 400 });
  }
  const prompt = buildStyledPrompt(basePrompt, imageSet.style);

  // Capture abort signal so we stop when the client disconnects
  const signal = request.signal;

  type SSEEventMap = {
    started: SSEStarted;
    progress: SSEProgress;
    image_saved: SSEImageSaved;
    warning: SSEWarning;
    error: SSEError;
    complete: SSEComplete;
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = <E extends keyof SSEEventMap>(event: E, data: SSEEventMap[E]) => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("started", {
          imageSetId: id,
          numImages: imageSet.numImages,
        });

        const dir = ensureImageSetDir(id);
        const openai = await getOpenAIClient();
        const autoOptimize = (await getSetting(SETTINGS_KEYS.AUTO_OPTIMIZE)) !== "false";
        const imageModel = (await getSetting(SETTINGS_KEYS.IMAGE_MODEL)) || DEFAULT_IMAGE_MODEL;
        const newImages: Array<{ id: string; fileName: string }> = [];

        // Load reference images if any exist
        const refs = await db
          .select()
          .from(referenceImages)
          .where(eq(referenceImages.imageSetId, id));

        const isDallE = imageModel.startsWith("dall-e");
        const hasRefs = refs.length > 0;

        // Warn if DALL-E model with reference images (not supported)
        if (hasRefs && isDallE) {
          send("warning", {
            message:
              "Reference images are not supported with DALL-E models. Generating without reference images.",
          });
        }

        // Prepare reference files for GPT Image models
        let referenceFiles: Awaited<ReturnType<typeof toFile>>[] = [];
        if (hasRefs && !isDallE) {
          referenceFiles = await Promise.all(
            refs.map(async (ref) => {
              const buffer = await fs.readFile(ref.filePath);
              return toFile(buffer, ref.originalName, { type: ref.mimeType });
            })
          );
        }

        // DALL-E 3 only supports n=1, so loop for it; all other models use n=numImages
        const isDallE3 = imageModel === "dall-e-3";
        const batchSize = isDallE3 ? 1 : imageSet.numImages;
        const iterations = isDallE3 ? imageSet.numImages : 1;

        for (let batch = 0; batch < iterations; batch++) {
          if (signal.aborted) break;

          send("progress", {
            current: batch * batchSize + 1,
            total: imageSet.numImages,
            status: isDallE3
              ? `Generating image ${batch + 1} of ${imageSet.numImages}...`
              : `Generating ${imageSet.numImages} image${imageSet.numImages > 1 ? "s" : ""}...`,
          });

          let response;
          if (referenceFiles.length > 0) {
            response = await openai.images.edit({
              model: imageModel,
              image: referenceFiles,
              prompt,
              n: batchSize,
              size: imageSet.size as "1024x1024" | "1024x1536" | "1536x1024",
              quality: imageSet.quality as "auto" | "low" | "medium" | "high",
            });
          } else {
            response = await openai.images.generate({
              model: imageModel,
              prompt,
              n: batchSize,
              size: isDallE
                ? (imageSet.size as "1024x1024")
                : (imageSet.size as "1024x1024" | "1024x1536" | "1536x1024"),
              quality: isDallE
                ? undefined
                : (imageSet.quality as "auto" | "low" | "medium" | "high"),
              ...(isDallE ? { response_format: "b64_json" as const } : {}),
            });
          }

          // Process all returned images from this API call
          for (let i = 0; i < (response.data?.length ?? 0); i++) {
            const imageData = response.data?.[i];
            if (!imageData?.b64_json) {
              send("error", {
                message: `No image data returned for image ${batch * batchSize + i + 1}`,
              });
              continue;
            }

            const globalIndex = batch * batchSize + i;
            const timestamp = Date.now();
            const fileName = `${timestamp}-${globalIndex}.png`;
            const filePath = path.join(dir, fileName);
            const buffer = Buffer.from(imageData.b64_json, "base64");
            await fs.writeFile(filePath, buffer);

            const imageId = crypto.randomUUID();
            await db.insert(generatedImages).values({
              id: imageId,
              imageSetId: id,
              filePath,
              fileName,
              createdAt: timestamp,
            });

            newImages.push({ id: imageId, fileName });

            send("image_saved", {
              current: globalIndex + 1,
              total: imageSet.numImages,
              image: { id: imageId, fileName },
            });

            // Auto-optimize if enabled
            if (autoOptimize) {
              try {
                const optimized = await optimizeImage(id, fileName);
                if (optimized) {
                  send("image_saved", {
                    current: globalIndex + 1,
                    total: imageSet.numImages,
                    image: {
                      id: optimized.id,
                      fileName: optimized.fileName,
                    },
                  });
                }
              } catch (e) {
                console.warn("Auto-optimize failed:", e instanceof Error ? e.message : e);
              }
            }
          }
        }

        // Update the imageSet's updatedAt
        await db.update(imageSets).set({ updatedAt: Date.now() }).where(eq(imageSets.id, id));

        send("complete", { images: newImages });
      } catch (error) {
        if (signal.aborted) return;
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
