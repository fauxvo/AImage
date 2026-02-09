import { NextResponse } from "next/server";
import { getImageFilePath } from "@/lib/paths";
import { optimizeImage } from "@/lib/optimize";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ imageSetId: string; fileName: string }> }
) {
  const { imageSetId, fileName } = await params;

  // Validate path (throws on traversal)
  try {
    getImageFilePath(imageSetId, fileName);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const result = await optimizeImage(imageSetId, fileName);

  if (!result) {
    return NextResponse.json({ error: "Source image not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
