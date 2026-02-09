import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageSets, generatedImages, referenceImages } from "@/db/schema";
import { updateImageSetSchema } from "@/lib/validations";
import { removeImageSetDir } from "@/lib/paths";
import { eq, desc } from "drizzle-orm";

function safeJsonParse(request: Request) {
  return request.json().catch(() => null);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imageSet = await db.select().from(imageSets).where(eq(imageSets.id, id)).get();

  if (!imageSet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const images = await db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.imageSetId, id))
    .orderBy(desc(generatedImages.createdAt));

  const refs = await db
    .select()
    .from(referenceImages)
    .where(eq(referenceImages.imageSetId, id))
    .orderBy(desc(referenceImages.createdAt));

  // Strip absolute filePath from client responses
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const safeImages = images.map(({ filePath, ...rest }) => rest);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const safeRefs = refs.map(({ filePath, ...rest }) => rest);

  return NextResponse.json({ ...imageSet, images: safeImages, referenceImages: safeRefs });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await safeJsonParse(request);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateImageSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await db.select().from(imageSets).where(eq(imageSets.id, id)).get();

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await db.select().from(imageSets).where(eq(imageSets.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete related records atomically (cascade should handle, but be explicit)
  await db.transaction(async (tx) => {
    await tx.delete(referenceImages).where(eq(referenceImages.imageSetId, id));
    await tx.delete(generatedImages).where(eq(generatedImages.imageSetId, id));
    await tx.delete(imageSets).where(eq(imageSets.id, id));
  });

  // Remove the asset folder (outside transaction — filesystem is not transactional)
  removeImageSetDir(id);

  return NextResponse.json({ success: true });
}
