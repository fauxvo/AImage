import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageSets, generatedImages } from "@/db/schema";
import { updateImageSetSchema } from "@/lib/validations";
import { removeImageSetDir } from "@/lib/paths";
import { eq, desc } from "drizzle-orm";

export async function GET(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const images = await db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.imageSetId, id))
    .orderBy(desc(generatedImages.createdAt));

  return NextResponse.json({ ...imageSet, images });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateImageSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(imageSets)
    .where(eq(imageSets.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(imageSets)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(imageSets.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db
    .select()
    .from(imageSets)
    .where(eq(imageSets.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete images from DB first (cascade should handle, but be explicit)
  await db.delete(generatedImages).where(eq(generatedImages.imageSetId, id));
  await db.delete(imageSets).where(eq(imageSets.id, id));

  // Remove the asset folder
  removeImageSetDir(id);

  return NextResponse.json({ success: true });
}
