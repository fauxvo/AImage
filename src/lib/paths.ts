import path from "path";
import fs from "fs";
import crypto from "crypto";

const BASE_DIR = path.resolve(process.cwd(), "generated-images");

/** Ensure the base generated-images directory exists */
export function ensureBaseDir(): void {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }
}

/** Get the absolute path for an image set's directory, with path traversal protection */
export function getImageSetDir(imageSetId: string): string {
  const dir = path.resolve(BASE_DIR, imageSetId);
  if (!dir.startsWith(BASE_DIR + path.sep) && dir !== BASE_DIR) {
    throw new Error("Invalid image set ID: path traversal detected");
  }
  return dir;
}

/** Ensure an image set's directory exists */
export function ensureImageSetDir(imageSetId: string): string {
  ensureBaseDir();
  const dir = getImageSetDir(imageSetId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Get the absolute path for a specific image file, with path traversal protection */
export function getImageFilePath(imageSetId: string, fileName: string): string {
  const dir = getImageSetDir(imageSetId);
  const filePath = path.resolve(dir, fileName);
  if (!filePath.startsWith(dir + path.sep) && filePath !== dir) {
    throw new Error("Invalid file name: path traversal detected");
  }
  return filePath;
}

/** Generate a unique filename for a reference image, preserving extension */
export function getReferenceImageFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".png";
  const random = crypto.randomBytes(4).toString("hex");
  return `ref-${Date.now()}-${random}${ext}`;
}

/** Remove an image set's directory and all files within it */
export function removeImageSetDir(imageSetId: string): void {
  const dir = getImageSetDir(imageSetId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
