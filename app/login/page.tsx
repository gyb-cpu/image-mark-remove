"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email, password,
      isRegister: isRegister ? "true" : "false",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    router.push("/app");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-2xl font-bold text-indigo-400 mb-8">dewatermark.ai</Link>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h1 className="text-xl font-semibold mb-6">{isRegister ? "Create account" : "Sign in"}</h1>

          <button
            onClick={() => signIn("google", { callbackUrl: "/app" })}
            className="w-full flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 rounded-xl py-2.5 mb-4 transition text-sm"
          >
            <span>🔵</span> Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl py-2.5 font-semibold transition">
              {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            {isRegister ? "Already have an account?" : "No account yet?"}{" "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-indigo-400 hover:text-indigo-300">
              {isRegister ? "Sign in" : "Sign up free"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
