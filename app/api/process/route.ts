import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { users } from "@/lib/users";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// IP-based rate limiting for guests
const ipUsage: Record<string, { count: number; date: string }> = {};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const today = new Date().toDateString();

  // Check rate limits
  if (!token?.email) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!ipUsage[ip] || ipUsage[ip].date !== today) {
      ipUsage[ip] = { count: 0, date: today };
    }
    if (ipUsage[ip].count >= 3) {
      return NextResponse.json({ error: "Daily limit reached. Sign up for more.", limitReached: true }, { status: 429 });
    }
    ipUsage[ip].count++;
  } else {
    const user = users[token.email as string];
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

    // Call Stability AI Inpainting API - process in memory, never store to disk
    const stabilityForm = new FormData();
    stabilityForm.append("image", imageFile);
    stabilityForm.append("mask", maskFile);
    stabilityForm.append("prompt", "clean background, seamless texture, no watermark");
    stabilityForm.append("output_format", "png");

    const stabilityRes = await fetch("https://api.stability.ai/v2beta/stable-image/edit/inpaint", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${process.env.STABILITY_API_KEY!}`,
        "accept": "image/*",
      },
      body: stabilityForm,
    });

    if (!stabilityRes.ok) {
      const err = await stabilityRes.text();
      return NextResponse.json({ error: `Stability AI error: ${err}` }, { status: 500 });
    }

    const rawBuffer = await stabilityRes.arrayBuffer();

    return new NextResponse(new Uint8Array(rawBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "attachment; filename=dewatermarked.png",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Processing failed" }, { status: 500 });
  }
}
