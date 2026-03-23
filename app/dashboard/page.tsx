import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const kv = (globalThis as any).USERS_KV;
  let isPro = false;
  let usageCount = 0;

  if (kv) {
    const raw = await kv.get(`user:${session.user.email}`);
    if (raw) {
      const user = JSON.parse(raw);
      isPro = user.isPro ?? false;
      usageCount = user.usageCount ?? 0;
    }
  }

  const limit = isPro ? "∞" : "5";
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-indigo-400">dewatermark.ai</Link>
        <Link href="/app" className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Open Tool</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {params.upgraded && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6 text-sm text-green-300">
            🎉 Welcome to Pro! Unlimited watermark removal is now unlocked.
          </div>
        )}

        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Plan</p>
            <p className="text-2xl font-bold">{isPro ? "Pro ✨" : "Free"}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Today&apos;s Usage</p>
            <p className="text-2xl font-bold">{usageCount} <span className="text-gray-500 text-lg font-normal">/ {limit}</span></p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-4">
          <p className="text-gray-400 text-sm mb-1">Account</p>
          <p className="font-medium">{session.user.email}</p>
        </div>

        {!isPro && (
          <Link href="/pricing" className="block text-center bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 font-semibold transition">
            Upgrade to Pro — $12/mo →
          </Link>
        )}
      </div>
    </main>
  );
}
