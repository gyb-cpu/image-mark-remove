// Edge-compatible session helper using next-auth JWT
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function auth(req?: NextRequest) {
  // In page context, use a simple approach
  // This is called server-side in edge runtime
  if (!req) {
    // For server components, use cookies directly
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("next-auth.session-token") || cookieStore.get("__Secure-next-auth.session-token");
    if (!token) return null;
    // Decode JWT
    try {
      const { decode } = await import("next-auth/jwt");
      const decoded = await decode({
        token: token.value,
        secret: process.env.NEXTAUTH_SECRET!,
      });
      if (!decoded?.email) return null;
      return { user: { email: decoded.email as string, id: decoded.id as string } };
    } catch {
      return null;
    }
  }
  return null;
}
