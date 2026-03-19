import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// In-memory user store for MVP (replace with D1 in production)
const users: Record<string, { id: string; email: string; password: string; isPro: boolean; usageCount: number; lastReset: string }> = {};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isRegister: { label: "Register", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const { email, password, isRegister } = credentials;
        if (isRegister === "true") {
          if (users[email]) throw new Error("Email already exists");
          const id = Math.random().toString(36).slice(2);
          users[email] = { id, email, password, isPro: false, usageCount: 0, lastReset: new Date().toDateString() };
          return { id, email };
        }
        const user = users[email];
        if (!user || user.password !== password) throw new Error("Invalid credentials");
        return { id: user.id, email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        const u = users[session.user.email!];
        if (u) {
          (session.user as any).isPro = u.isPro;
          // Reset daily count
          if (u.lastReset !== new Date().toDateString()) {
            u.usageCount = 0;
            u.lastReset = new Date().toDateString();
          }
          (session.user as any).usageCount = u.usageCount;
        }
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

export { users };
