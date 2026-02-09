import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageSets } from "@/db/schema";
import { createImageSetSchema } from "@/lib/validations";
import { ensureImageSetDir } from "@/lib/paths";
import { desc } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  const sets = await db
    .select()
    .from(imageSets)
    .orderBy(desc(imageSets.createdAt));
  return NextResponse.json(sets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createImageSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const name = parsed.data.name || `Image Set ${new Date(now).toLocaleString()}`;

  ensureImageSetDir(id);

  const [created] = await db
    .insert(imageSets)
    .values({
      id,
      name,
      prompt: parsed.data.prompt || "",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
