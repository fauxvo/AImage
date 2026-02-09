import { NextResponse } from "next/server";
import { db } from "@/db";
import { referenceImages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  const { id, refId } = await params;

  // Verify the reference image exists AND belongs to the specified image set
  const ref = await db
    .select()
    .from(referenceImages)
    .where(and(eq(referenceImages.id, refId), eq(referenceImages.imageSetId, id)))
    .get();

  if (!ref) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Remove file from disk
  if (fs.existsSync(ref.filePath)) {
    fs.unlinkSync(ref.filePath);
  }

  // Remove DB record
  await db.delete(referenceImages).where(eq(referenceImages.id, refId));

  return NextResponse.json({ success: true });
}
