import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import { RoleName } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      role: RoleName;
      studentId?: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    role: RoleName;
    studentId?: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleName;
    studentId?: string;
  }
}

export const authConfig = {
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentId = user.studentId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.studentId = token.studentId;
      }
      return session;
    },
  },
  providers: [],
} satisfies Partial<NextAuthOptions>;

export function getDashboardPath(role: RoleName): string {
  switch (role) {
    case RoleName.ADMINISTRATOR:
      return "/admin";
    case RoleName.STAFF:
      return "/staff";
    case RoleName.STUDENT:
      return "/student";
    default:
      return "/login";
  }
}
