import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getUsageHistory } from "@/lib/users-memory";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = getUser(session.user.email);
  const history = getUsageHistory(session.user.email);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-indigo-400">dewatermark.ai</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</Link>
          <Link href="/app" className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Open Tool</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-8">Usage History</h1>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-4">📝</p>
              <p>No usage history yet</p>
              <Link href="/app" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
                Start removing watermarks →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-gray-400 font-medium">Date</th>
                  <th className="text-left px-6 py-3 text-sm text-gray-400 font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-gray-400 font-medium">Credits</th>
                  <th className="text-left px-6 py-3 text-sm text-gray-400 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-800/30 transition">
                    <td className="px-6 py-4 text-sm">
                      {new Date(record.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                        record.status === 'processing' ? 'bg-yellow-900/30 text-yellow-400' :
                        record.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{record.creditsUsed}</td>
                    <td className="px-6 py-4">
                      {record.resultUrl && record.status === 'completed' ? (
                        <a
                          href={record.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 text-sm"
                        >
                          View Result →
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {history.length > 0 && (
          <p className="text-gray-500 text-sm mt-4 text-center">
            Showing {history.length} recent records
          </p>
        )}

        <div className="flex gap-4 mt-8">
          <Link href="/dashboard/profile" className="text-indigo-400 hover:text-indigo-300 transition">
            ← Profile Settings
          </Link>
          <Link href="/dashboard/subscription" className="text-indigo-400 hover:text-indigo-300 transition">
            Subscription →
          </Link>
        </div>
      </div>
    </main>
  );
}