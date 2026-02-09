import { getImageFilePath } from "@/lib/paths";
import fs from "fs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageSetId: string; fileName: string }> }
) {
  const { imageSetId, fileName } = await params;

  let filePath: string;
  try {
    filePath = getImageFilePath(imageSetId, fileName);
  } catch {
    return new Response("Invalid path", { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
