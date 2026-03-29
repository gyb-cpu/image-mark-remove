import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import ProButton from "./pro-button";

export const metadata: Metadata = {
  title: "Pricing — dewatermark.ai",
  description: "Free and Pro plans for AI watermark removal.",
};

export const runtime = 'edge';

export default async function PricingPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-indigo-400">dewatermark.ai</Link>
        <div className="flex gap-4 text-sm items-center">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Dashboard</Link>
              <span className="text-gray-400">{session.user.email}</span>
            </>
          ) : (
            <Link href="/login" className="text-gray-400 hover:text-white">Login</Link>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Simple Pricing</h1>
        <p className="text-gray-400 mb-12">Start free. Upgrade when you need more.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-left">
            <h2 className="text-xl font-bold mb-1">Free</h2>
            <p className="text-4xl font-extrabold my-4">$0</p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8">
              {["5 images/day (registered)", "3 images/day (guest)", "1080px output resolution", "Standard queue"].map((f) => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/app" className="block text-center border border-gray-700 hover:border-gray-500 rounded-xl py-2.5 transition">
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-indigo-950 rounded-2xl p-8 border border-indigo-700 text-left relative">
            <span className="absolute top-4 right-4 bg-indigo-600 text-xs px-2 py-1 rounded-full">Popular</span>
            <h2 className="text-xl font-bold mb-1">Pro</h2>
            <p className="text-4xl font-extrabold my-4">$12<span className="text-lg font-normal text-gray-400">/mo</span></p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8">
              {["Unlimited images", "Original resolution output", "Priority queue", "Batch processing (coming soon)", "Email support"].map((f) => (
                <li key={f} className="flex items-center gap-2"><span className="text-indigo-400">✓</span>{f}</li>
              ))}
            </ul>
            <div className="mt-6">
              <ProButton />
            </div>
            <div className="text-xs text-gray-400 mt-4 text-center">
              Secure payment via PayPal · Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
