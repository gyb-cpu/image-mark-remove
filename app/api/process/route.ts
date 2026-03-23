import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const today = new Date().toDateString();
  const kv = (globalThis as any).USERS_KV;

  // Check rate limits
  if (!session?.user?.email) {
    // Guest: IP-based rate limit via KV
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (kv) {
      const raw = await kv.get(`ip:${ip}:${today}`);
      const count = raw ? parseInt(raw) : 0;
      if (count >= 3) {
        return NextResponse.json({ error: "Daily limit reached. Sign up for more.", limitReached: true }, { status: 429 });
      }
      await kv.put(`ip:${ip}:${today}`, String(count + 1), { expirationTtl: 86400 });
    }
  } else {
    // Logged-in user: check usage from KV
    if (kv) {
      const email = session.user.email;
      const raw = await kv.get(`user:${email}`);
      if (raw) {
        const user = JSON.parse(raw);
        if (user.lastReset !== today) { user.usageCount = 0; user.lastReset = today; }
        if (!user.isPro && user.usageCount >= 5) {
          return NextResponse.json({ error: "Daily limit reached. Upgrade to Pro.", limitReached: true }, { status: 429 });
        }
        user.usageCount++;
        await kv.put(`user:${email}`, JSON.stringify(user));
      }
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
