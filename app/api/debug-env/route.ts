import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    hasPaypalClientId: !!process.env.PAYPAL_CLIENT_ID,
    hasPaypalSecret: !!process.env.PAYPAL_SECRET,
    hasPaypalApiUrl: !!process.env.PAYPAL_API_URL,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextauthUrl: !!process.env.NEXTAUTH_URL,
    paypalApiUrl: process.env.PAYPAL_API_URL,
    nextauthUrl: process.env.NEXTAUTH_URL,
  });
}
