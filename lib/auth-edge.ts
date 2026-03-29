// Edge-compatible session helper using next-auth JWT
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
    // Decode JWT - v5 uses different salt format
    try {
      const { decode } = await import("next-auth/jwt");
      const decoded = await decode({
        token: token.value,
        secret: process.env.NEXTAUTH_SECRET!,
        salt: "next-auth.session-token",
      });
      if (!decoded?.email) return null;
      return { user: { email: decoded.email as string, id: decoded.id as string } };
    } catch {
      return null;
    }
  }
  return null;
}
