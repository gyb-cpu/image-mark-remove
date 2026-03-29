import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "dewatermark.ai — Free AI Watermark Remover Online",
  description: "Remove watermarks from images instantly with AI. Free online watermark remover. No signup required for first 3 images.",
  openGraph: {
    title: "dewatermark.ai — Free AI Watermark Remover",
    description: "Remove watermarks from images instantly with AI. Clean, fast, no traces left.",
    url: "https://dewatermark.ai",
    siteName: "dewatermark.ai",
    type: "website",
  },
};

export const runtime = 'edge';

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-indigo-400">dewatermark.ai</Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/pricing" className="text-gray-400 hover:text-white transition">Pricing</Link>
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</Link>
              <Link href="/app" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Try Free</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-400 hover:text-white transition">Login</Link>
              <Link href="/app" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Try Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 gap-6">
        <h1 className="text-5xl font-extrabold leading-tight max-w-2xl">
          Remove Watermarks from Images with AI
        </h1>
        <p className="text-gray-400 text-lg max-w-xl">
          Upload your image, select the watermark area, and let AI do the rest. No traces, no storage, no hassle.
        </p>
        <Link href="/app" className="bg-indigo-600 hover:bg-indigo-500 text-white text-lg px-8 py-3 rounded-xl font-semibold transition">
          Remove Watermark Free →
        </Link>
        <p className="text-gray-500 text-sm">No signup needed · 3 free images/day</p>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-24 max-w-5xl mx-auto">
        {[
          { icon: "🎯", title: "Precise Selection", desc: "Draw rectangles over watermark areas. Support multiple selections." },
          { icon: "🤖", title: "AI-Powered Removal", desc: "Powered by Clipdrop AI. Seamless inpainting with no visible traces." },
          { icon: "🔒", title: "Privacy First", desc: "Your images are never stored. Processed in memory and returned instantly." },
        ].map((f) => (
          <div key={f.title} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 text-sm pb-8">
        © 2026 dewatermark.ai · <Link href="/pricing" className="hover:text-gray-400">Pricing</Link>
      </footer>
    </main>
  );
}
