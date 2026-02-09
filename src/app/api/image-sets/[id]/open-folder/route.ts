import { NextResponse } from "next/server";
import { getImageSetDir } from "@/lib/paths";
import { spawn } from "child_process";
import fs from "fs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let dir: string;
  try {
    dir = getImageSetDir(id);
  } catch {
    return NextResponse.json({ error: "Invalid image set ID" }, { status: 400 });
  }

  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Use spawn with array args to prevent command injection
  spawn("open", [dir], { detached: true, stdio: "ignore" }).unref();

  return NextResponse.json({ success: true });
}
