import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(c => c.trim());
  
  return NextResponse.json({
    rawCookies: cookieHeader.substring(0, 200),
    parsedCookies: cookies,
    hasSessionToken: cookies.some(c => c.startsWith('next-auth')),
    nextAuthCookies: cookies.filter(c => c.startsWith('next-auth'))
  });
}
