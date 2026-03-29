import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUser, updateUser, addUsageRecord } from "@/lib/users-memory";

export const runtime = 'edge';

const PAYPAL_API_URL = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET!;

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
    const session = await auth();
    console.log("Session:", JSON.stringify(session));
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: "Unauthorized - Please log in first",
        session: session ? "exists" : "null"
      }, { status: 401 });
    }

    const { orderId } = await request.json();
    console.log("Order ID:", orderId);

    const accessToken = await getPayPalAccessToken();
    console.log("Got access token");

    // Capture the payment
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("PayPal response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("PayPal error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    const capture = await response.json();
    console.log("Capture result:", capture);
    
    const status = capture.status;

    if (status === "COMPLETED") {
      // Update user to Pro
      const user = getUser(session.user.email);
      if (user) {
        updateUser(session.user.email, {
          isPro: true,
          subscriptionStatus: "active",
          subscriptionId: `paypal_${orderId}`,
        });
      }

      // Add usage record
      addUsageRecord(session.user.email, {
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
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
