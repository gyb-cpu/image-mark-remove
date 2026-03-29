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
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();

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
      return NextResponse.json({ error }, { status: 400 });
    }

    const capture = await response.json();
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
    return NextResponse.json({ error: "Failed to capture PayPal payment" }, { status: 500 });
  }
}
