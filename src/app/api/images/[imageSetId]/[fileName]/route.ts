import { getImageFilePath } from "@/lib/paths";
import fs from "fs";
import { Readable } from "stream";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

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

  const ext = path.extname(fileName).toLowerCase();
  const contentType = MIME_TYPES[ext] || "image/png";
  const stat = fs.statSync(filePath);

  // Stream the file instead of buffering the entire image into memory
  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
