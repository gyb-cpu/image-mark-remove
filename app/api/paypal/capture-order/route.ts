import { NextRequest, NextResponse } from "next/server";
import { getUser, updateUser, addUsageRecord } from "@/lib/users-memory";
import { jwtVerify } from "jose";

export const runtime = 'edge';

const PAYPAL_API_URL = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET!;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

async function getPayPalAccessToken() {
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    // Parse cookies from request header
    const cookieHeader = request.headers.get('cookie') || '';
    console.log("Raw cookie header:", cookieHeader.substring(0, 100) + (cookieHeader.length > 100 ? '...' : ''));
    
    // Parse cookie properly
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(c => {
      const eq = c.indexOf('=');
      if (eq > 0) {
        const key = c.substring(0, eq).trim();
        const val = c.substring(eq + 1).trim();
        cookies[key] = val;
      }
    });
    
    console.log("Parsed cookies:", Object.keys(cookies));
    
    const sessionToken = cookies['next-auth.session-token'];
    
    console.log("Has session token:", !!sessionToken);
    console.log("Token length:", sessionToken?.length);
    console.log("Has NEXTAUTH_SECRET:", !!NEXTAUTH_SECRET);
    
    if (!sessionToken) {
      return NextResponse.json({ 
        error: "Unauthorized - No session cookie found. Please log in first.",
        debug: { 
          hasCookie: !!sessionToken,
          availableCookies: Object.keys(cookies)
        }
      }, { status: 401 });
    }

    if (!NEXTAUTH_SECRET) {
      return NextResponse.json({ 
        error: "Server configuration error - NEXTAUTH_SECRET not set",
        debug: { hasSecret: !!NEXTAUTH_SECRET }
      }, { status: 500 });
    }

    // Verify JWT token
    let email: string;
    try {
      // Decode URL-encoded token if needed
      const decodedToken = decodeURIComponent(sessionToken);
      console.log("Decoded token length:", decodedToken.length);
      
      const secret = new TextEncoder().encode(NEXTAUTH_SECRET);
      const { payload } = await jwtVerify(decodedToken, secret);
      email = payload.email as string;
      console.log("Decoded email:", email);
      console.log("Token payload:", payload);
    } catch (e) {
      console.error("JWT verification failed:", e);
      return NextResponse.json({ 
        error: "Invalid session token",
        debug: { 
          error: e instanceof Error ? e.message : "Unknown",
          tokenLength: sessionToken?.length,
          tokenStart: sessionToken?.substring(0, 50)
        }
      }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ 
        error: "Invalid session - no email in token"
      }, { status: 401 });
    }

    const { orderId } = await request.json();
    console.log("Processing order:", orderId);

    const accessToken = await getPayPalAccessToken();

    // Capture the payment
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("PayPal capture error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    const capture = await response.json();
    const status = capture.status;

    if (status === "COMPLETED") {
      // Update user to Pro
      const user = getUser(email);
      if (user) {
        updateUser(email, {
          isPro: true,
          subscriptionStatus: "active",
          subscriptionId: `paypal_${orderId}`,
        });
      }

      // Add usage record
      addUsageRecord(email, {
        originalUrl: "",
        resultUrl: "",
        status: "completed",
        creditsUsed: 0,
      });

      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        capture,
      });
    }

    return NextResponse.json({ status }, { status: 200 });
  } catch (error) {
    console.error("PayPal capture error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: "Failed to capture PayPal payment",
      details: errorMessage
    }, { status: 500 });
  }
}
