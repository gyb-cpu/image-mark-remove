import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/users-memory";

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = getUser(session.user.email);

  const plan = user?.isPro ? 'Pro' : 'Free';
  const status = user?.subscriptionStatus || 'free';
  const nextBilling = user?.subscriptionId 
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-indigo-400">dewatermark.ai</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</Link>
          <Link href="/app" className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Open Tool</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-8">Subscription</h1>

        {/* Current Plan */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <p className="text-gray-400 text-sm mb-2">Current Plan</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{plan}</p>
              <p className="text-gray-400 text-sm mt-1">
                {plan === 'Pro' ? '$12/month' : 'Free forever'}
              </p>
            </div>
            <div className={`text-4xl ${plan === 'Pro' ? '✨' : '🆓'}`}>
              {plan === 'Pro' ? '✨' : '🆓'}
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        {plan === 'Pro' && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
            <p className="text-gray-400 text-sm mb-2">Subscription Status</p>
            <div className="flex items-center justify-between">
              <div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  status === 'active' ? 'bg-green-900/30 text-green-400' :
                  status === 'canceled' ? 'bg-yellow-900/30 text-yellow-400' :
                  status === 'past_due' ? 'bg-red-900/30 text-red-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {status === 'active' ? 'Active' :
                   status === 'canceled' ? 'Canceled' :
                   status === 'past_due' ? 'Past Due' : status}
                </span>
                {nextBilling && status === 'active' && (
                  <p className="text-gray-400 text-sm mt-2">
                    Next billing date: {nextBilling}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <p className="text-gray-400 text-sm mb-4">Plan Features</p>
          <ul className="space-y-3">
            {plan === 'Pro' ? (
              <>
                <li className="flex items-center gap-2 text-green-400">✓ Unlimited watermark removal</li>
                <li className="flex items-center gap-2 text-green-400">✓ Faster processing</li>
                <li className="flex items-center gap-2 text-green-400">✓ Priority support</li>
                <li className="flex items-center gap-2 text-green-400">✓ High resolution exports</li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2 text-gray-400">✓ 5 free watermark removals/day</li>
                <li className="flex items-center gap-2 text-gray-400">✓ Standard processing speed</li>
                <li className="flex items-center gap-2 text-gray-400">✓ Community support</li>
                <li className="flex items-center gap-2 text-gray-400">✓ Basic resolution exports</li>
              </>
            )}
          </ul>
        </div>

        {/* Actions */}
        {!user?.isPro && (
          <Link
            href="/pricing"
            className="block text-center bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 font-semibold transition"
          >
            Upgrade to Pro — $12/mo →
          </Link>
        )}

        {user?.isPro && status === 'active' && (
          <form action="/api/stripe/cancel" method="POST">
            <button
              type="submit"
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl py-3 font-semibold transition"
              onClick="return confirm('Are you sure you want to cancel? You will lose access at the end of billing period.')"
            >
              Cancel Subscription
            </button>
          </form>
        )}

        <div className="flex gap-4 mt-8">
          <Link href="/dashboard/profile" className="text-indigo-400 hover:text-indigo-300 transition">
            ← Profile Settings
          </Link>
          <Link href="/dashboard/history" className="text-indigo-400 hover:text-indigo-300 transition">
            Usage History →
          </Link>
        </div>
      </div>
    </main>
  );
}