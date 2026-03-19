import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, users } from "@/lib/auth";

// IP-based rate limiting for guests
const ipUsage: Record<string, { count: number; date: string }> = {};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const today = new Date().toDateString();

  // Check rate limits
  if (!session?.user?.email) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!ipUsage[ip] || ipUsage[ip].date !== today) {
      ipUsage[ip] = { count: 0, date: today };
    }
    if (ipUsage[ip].count >= 3) {
      return NextResponse.json({ error: "Daily limit reached. Sign up for more.", limitReached: true }, { status: 429 });
    }
    ipUsage[ip].count++;
  } else {
    const user = users[session.user.email];
    if (user) {
      if (user.lastReset !== today) { user.usageCount = 0; user.lastReset = today; }
      if (!user.isPro && user.usageCount >= 5) {
        return NextResponse.json({ error: "Daily limit reached. Upgrade to Pro.", limitReached: true }, { status: 429 });
      }
      user.usageCount++;
    }
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    const maskFile = formData.get("mask") as File;

    if (!imageFile || !maskFile) {
      return NextResponse.json({ error: "Image and mask required" }, { status: 400 });
    }

    // Call Clipdrop API - process in memory, never store to disk
    const clipdropForm = new FormData();
    clipdropForm.append("image_file", imageFile);
    clipdropForm.append("mask_file", maskFile);

    const clipdropRes = await fetch("https://clipdrop-api.co/cleanup/v1", {
      method: "POST",
      headers: { "x-api-key": process.env.CLIPDROP_API_KEY! },
      body: clipdropForm,
    });

    if (!clipdropRes.ok) {
      const err = await clipdropRes.text();
      return NextResponse.json({ error: `Clipdrop error: ${err}` }, { status: 500 });
    }

    const isPro = session?.user && (session.user as any).isPro;
    const rawBuffer = Buffer.from(await clipdropRes.arrayBuffer());
    let resultBuffer: Buffer;

    // Compress for free users
    if (!isPro) {
      const sharp = (await import("sharp")).default;
      resultBuffer = await sharp(rawBuffer).resize(1080, 1080, { fit: "inside", withoutEnlargement: true }).toBuffer() as Buffer;
    } else {
      resultBuffer = rawBuffer;
    }

    return new NextResponse(new Uint8Array(resultBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "attachment; filename=dewatermarked.png",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Processing failed" }, { status: 500 });
  }
}
