import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // On login, pick up the user's first farm membership
        const membership = await prisma.farmMembership.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        });
        token.activeFarmId = membership?.farmId ?? null;
      }
      if (trigger === "update" && session?.activeFarmId !== undefined) {
        // Farm switch — validate the user is actually a member
        if (session.activeFarmId === null) {
          token.activeFarmId = null;
        } else {
          const membership = await prisma.farmMembership.findUnique({
            where: {
              farmId_userId: {
                farmId: session.activeFarmId,
                userId: token.id as string,
              },
            },
          });
          if (membership) {
            token.activeFarmId = session.activeFarmId;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.activeFarmId = (token.activeFarmId as string) ?? null;
      }
      return session;
    },
  },
};
