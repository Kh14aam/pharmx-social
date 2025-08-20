import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Apple from "next-auth/providers/apple"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID!,
      clientSecret: {
        teamId: process.env.AUTH_APPLE_TEAM_ID!,
        privateKey: process.env.AUTH_APPLE_PRIVATE_KEY!,
        keyId: process.env.AUTH_APPLE_KEY_ID!,
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // After signin, check if user has completed profile
      if (url.startsWith(baseUrl)) {
        return url
      }
      return baseUrl + "/app/voice"
    },
  },
  session: {
    strategy: "database",
  },
  secret: process.env.AUTH_SECRET,
})
