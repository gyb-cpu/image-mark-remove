import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";


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
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const today = new Date().toDateString();
  const kv = (globalThis as any).USERS_KV;

  if (!token?.email) {
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
    if (kv) {
      const email = token.email as string;
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
