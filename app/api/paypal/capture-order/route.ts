import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUser, updateUser, addUsageRecord } from "@/lib/users-memory";

export const runtime = 'edge';

const PAYPAL_API_URL = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET!;

async function getPayPalAccessToken() {
  try {
    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) throw new Error("Failed to get token");
    const data = await response.json();
    return data.access_token;
  } catch (e) {
    console.error("Token error:", e);
    throw e;
  }
}

export async function POST(request: NextRequest) {
  const debug: any = {};
  
  try {
    // Step 1: Get session
    debug.step1 = "Getting session";
    const session = await auth();
    debug.session = session ? { email: session.user?.email, hasId: !!session.user?.id } : null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized", debug }, { status: 401 });
    }

    // Step 2: Get order ID
    debug.step2 = "Parsing order";
    const { orderId } = await request.json();
    debug.orderId = orderId;

    // Step 3: Get PayPal token
    debug.step3 = "Getting PayPal token";
    const accessToken = await getPayPalAccessToken();
    debug.hasToken = !!accessToken;

    // Step 4: Capture payment
    debug.step4 = "Capturing payment";
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    debug.paypalStatus = response.status;

    if (!response.ok) {
      const error = await response.json();
      debug.paypalError = error;
      return NextResponse.json({ error, debug }, { status: 400 });
    }

    const capture = await response.json();
    debug.capture = { status: capture.status };

    if (capture.status === "COMPLETED") {
      // Step 5: Update user
      debug.step5 = "Updating user";
      const user = getUser(session.user.email);
      if (user) {
        updateUser(session.user.email, {
          isPro: true,
          subscriptionStatus: "active",
          subscriptionId: `paypal_${orderId}`,
        });
      }
      addUsageRecord(session.user.email, {
        originalUrl: "", resultUrl: "", status: "completed", creditsUsed: 0,
      });

      return NextResponse.json({ success: true, debug });
    }

    return NextResponse.json({ debug });
  } catch (error) {
    debug.error = error instanceof Error ? error.message : "Unknown";
    console.error("Full error:", debug);
    return NextResponse.json({ error: "Payment failed", debug }, { status: 500 });
  }
}
