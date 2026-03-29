import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  return NextResponse.json({
    hasSession: !!session,
    user: session?.user,
    expires: session?.expires
  });
}
