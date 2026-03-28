import { NextRequest, NextResponse } from "next/server";
import { getUser, updateUser } from "@/lib/users-memory";

const PAYPAL_API_URL = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    const webhookId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const certUrl = headers.get("paypal-cert-url");
    const transmissionSig = headers.get("paypal-transmission-sig");

    // TODO: Verify webhook signature (requires PayPal public key)
    // For now, just process the webhook

    const event = JSON.parse(body);
    console.log("PayPal webhook event:", event.event_type);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const email = event.resource.custom_id; // We'll pass email in custom_id
      if (email) {
        const user = getUser(email);
        if (user) {
          updateUser(email, {
            isPro: true,
            subscriptionStatus: "active",
            subscriptionId: `paypal_${event.resource.id}`,
          });
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
