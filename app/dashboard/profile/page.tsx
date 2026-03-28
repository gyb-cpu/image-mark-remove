import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, updateUser } from "@/lib/users-memory";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = getUser(session.user.email);

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
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <div className="flex items-center gap-6 mb-6">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-20 h-20 rounded-full" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold">
                {session.user.email[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-lg">{user?.name || 'Not set'}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <form action="/api/user/profile" method="POST" className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Display Name</label>
              <input
                type="text"
                name="name"
                defaultValue={user?.name || ''}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={session.user.email}
                disabled
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Account Type</label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${user?.isPro ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                  {user?.isPro ? 'Pro' : 'Free'}
                </span>
                <span className="text-gray-500 text-sm">
                  {user?.googleId ? 'Google OAuth' : 'Email'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Member Since</label>
              <p className="text-gray-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 font-semibold transition"
            >
              Save Changes
            </button>
          </form>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard/history" className="text-indigo-400 hover:text-indigo-300 transition">
            ← Usage History
          </Link>
          <Link href="/dashboard/subscription" className="text-indigo-400 hover:text-indigo-300 transition">
            Subscription →
          </Link>
        </div>
      </div>
    </main>
  );
}