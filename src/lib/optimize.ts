import { db } from "@/db";
import { generatedImages } from "@/db/schema";
import { getImageSetDir, getImageFilePath } from "@/lib/paths";
import { eq, and } from "drizzle-orm";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export interface OptimizeResult {
  id: string;
  imageSetId: string;
  fileName: string;
  filePath: string;
  createdAt: number;
  originalSize: number;
  optimizedSize: number;
  savings: number;
}

/**
 * Optimize an image to WebP format and record it in the database.
 * Returns the result, or null if the source file doesn't exist.
 * If already optimized, returns the existing record.
 */
export async function optimizeImage(
  imageSetId: string,
  fileName: string
): Promise<OptimizeResult | null> {
  const dir = getImageSetDir(imageSetId);
  const sourcePath = getImageFilePath(imageSetId, fileName);

  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  const parsed = path.parse(fileName);
  const optimizedFileName = `${parsed.name}_optimized.webp`;
  const optimizedPath = path.join(dir, optimizedFileName);

  // Check if already optimized
  if (fs.existsSync(optimizedPath)) {
    const existing = await db
      .select()
      .from(generatedImages)
      .where(
        and(
          eq(generatedImages.imageSetId, imageSetId),
          eq(generatedImages.fileName, optimizedFileName)
        )
      )
      .get();

    if (existing) {
      const originalSize = fs.statSync(sourcePath).size;
      const optimizedSize = fs.statSync(optimizedPath).size;
      return {
        ...existing,
        originalSize,
        optimizedSize,
        savings: Math.round((1 - optimizedSize / originalSize) * 100),
      };
    }
  }

  // Optimize with sharp
  const sourceBuffer = fs.readFileSync(sourcePath);
  const originalSize = sourceBuffer.length;

  const optimizedBuffer = await sharp(sourceBuffer).webp({ quality: 80, effort: 6 }).toBuffer();

  const optimizedSize = optimizedBuffer.length;

  fs.writeFileSync(optimizedPath, optimizedBuffer);

  const id = crypto.randomUUID();
  const now = Date.now();

  const [record] = await db
    .insert(generatedImages)
    .values({
      id,
      imageSetId,
      filePath: optimizedPath,
      fileName: optimizedFileName,
      createdAt: now,
    })
    .returning();

  return {
    ...record,
    originalSize,
    optimizedSize,
    savings: Math.round((1 - optimizedSize / originalSize) * 100),
  };
}
