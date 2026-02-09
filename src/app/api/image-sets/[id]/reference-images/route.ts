import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageSets, referenceImages } from "@/db/schema";
import {
  REFERENCE_IMAGE_LIMITS,
  type ReferenceImageUploadResult,
  type ReferenceImageUploadError,
  type ReferenceImageUploadResponse,
} from "@/lib/validations";
import { ensureImageSetDir, getImageFilePath, getReferenceImageFileName } from "@/lib/paths";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const refs = await db
    .select()
    .from(referenceImages)
    .where(eq(referenceImages.imageSetId, id))
    .orderBy(desc(referenceImages.createdAt));

  return NextResponse.json(refs);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const imageSet = await db.select().from(imageSets).where(eq(imageSets.id, id)).get();
  if (!imageSet) {
    return NextResponse.json({ error: "Image set not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > REFERENCE_IMAGE_LIMITS.MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Maximum ${REFERENCE_IMAGE_LIMITS.MAX_FILES_PER_UPLOAD} files per upload` },
      { status: 400 }
    );
  }

  // Enforce total-per-set limit
  const existingCount = await db
    .select()
    .from(referenceImages)
    .where(eq(referenceImages.imageSetId, id));
  const totalAfter = existingCount.length + files.length;
  if (totalAfter > REFERENCE_IMAGE_LIMITS.MAX_REFS_PER_SET) {
    return NextResponse.json(
      {
        error: `Maximum ${REFERENCE_IMAGE_LIMITS.MAX_REFS_PER_SET} reference images per set (currently ${existingCount.length})`,
      },
      { status: 400 }
    );
  }

  ensureImageSetDir(id);
  const created: ReferenceImageUploadResult[] = [];
  const errors: ReferenceImageUploadError[] = [];

  const allowedTypes: readonly string[] = REFERENCE_IMAGE_LIMITS.ALLOWED_MIME_TYPES;

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        fileName: file.name,
        error: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}`,
      });
      continue;
    }

    if (file.size > REFERENCE_IMAGE_LIMITS.MAX_FILE_SIZE) {
      errors.push({
        fileName: file.name,
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: ${REFERENCE_IMAGE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
      continue;
    }

    const fileName = getReferenceImageFileName(file.name);
    const filePath = getImageFilePath(id, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const refId = crypto.randomUUID();
    await db.insert(referenceImages).values({
      id: refId,
      imageSetId: id,
      filePath,
      fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: Date.now(),
    });

    created.push({
      id: refId,
      fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  }

  const response: ReferenceImageUploadResponse = { created, errors };
  return NextResponse.json(response, { status: created.length > 0 ? 201 : 200 });
}
