import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
        const kv = (globalThis as any).USERS_KV;

        if (isRegister === "true") {
          if (kv) {
            const existing = await kv.get(`user:${email}`);
            if (existing) throw new Error("Email already exists");
            const id = Math.random().toString(36).slice(2);
            await kv.put(`user:${email}`, JSON.stringify({
              id, email, password, isPro: false, usageCount: 0, lastReset: new Date().toDateString()
            }));
            return { id, email };
          }
          return null;
        }

        if (kv) {
          const raw = await kv.get(`user:${email}`);
          if (!raw) throw new Error("Invalid credentials");
          const user = JSON.parse(raw);
          if (user.password !== password) throw new Error("Invalid credentials");
          return { id: user.id, email };
        }
        return null;
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
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
