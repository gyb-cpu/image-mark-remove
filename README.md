# dewatermark.ai

AI-powered watermark remover. Upload image, select watermark area, download clean result.

## Tech Stack

- Next.js 14 (App Router) + Tailwind CSS
- NextAuth.js (Email + Google OAuth)
- Clipdrop API (AI watermark removal)
- Stripe (subscription payments)
- Cloudflare Pages + Workers (deployment)

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

## Required API Keys

| Key | Where to get |
|-----|-------------|
| `CLIPDROP_API_KEY` | https://clipdrop.co/apis |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook` |
| `STRIPE_PRO_PRICE_ID` | Create a $12/mo recurring price in Stripe dashboard |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID/SECRET` | https://console.cloud.google.com |

## Pages

- `/` — Landing page
- `/app` — Main watermark removal tool
- `/login` — Auth page
- `/pricing` — Pricing page
- `/dashboard` — User dashboard

## Deploy to Cloudflare

```bash
npm run build
npx wrangler pages deploy .next
```
