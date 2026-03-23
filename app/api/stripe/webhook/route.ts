import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const kv = (globalThis as any).USERS_KV;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const email = session.metadata?.userEmail || session.customer_email;
    if (email && kv) {
      const raw = await kv.get(`user:${email}`);
      if (raw) {
        const user = JSON.parse(raw);
        user.isPro = true;
        await kv.put(`user:${email}`, JSON.stringify(user));
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as import("stripe").Stripe.Subscription;
    const customer = await stripe.customers.retrieve(sub.customer as string) as import("stripe").Stripe.Customer;
    if (customer.email && kv) {
      const raw = await kv.get(`user:${customer.email}`);
      if (raw) {
        const user = JSON.parse(raw);
        user.isPro = false;
        await kv.put(`user:${customer.email}`, JSON.stringify(user));
      }
    }
  }

  return NextResponse.json({ received: true });
}
