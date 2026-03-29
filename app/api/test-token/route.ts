import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const runtime = 'edge';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }
  
  if (!NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "NEXTAUTH_SECRET not set" }, { status: 500 });
  }
  
  try {
    const decodedToken = decodeURIComponent(token);
    const secret = new TextEncoder().encode(NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(decodedToken, secret);
    return NextResponse.json({ success: true, payload });
  } catch (e) {
    return NextResponse.json({ 
      error: "Verification failed",
      details: e instanceof Error ? e.message : "Unknown",
      secretLength: NEXTAUTH_SECRET.length,
      tokenLength: token.length
    }, { status: 401 });
  }
}
