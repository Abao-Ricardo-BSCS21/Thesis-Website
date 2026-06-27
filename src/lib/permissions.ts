import { RoleName } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(allowedRoles?: RoleName[]) {
  const session = await getSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return {
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}

export const rolePermissions = {
  [RoleName.ADMINISTRATOR]: [
    "users:read",
    "users:write",
    "transactions:read",
    "transactions:write",
    "rewards:read",
    "rewards:write",
    "reports:read",
    "reports:write",
    "machine:read",
    "machine:write",
    "settings:read",
    "settings:write",
    "notifications:read",
    "notifications:write",
  ],
  [RoleName.STAFF]: [
    "transactions:read",
    "rewards:read",
    "rewards:approve",
    "reports:read",
    "machine:read",
    "students:read",
    "students:write",
    "notifications:read",
  ],
  [RoleName.STUDENT]: [
    "profile:read",
    "transactions:read:own",
    "rewards:read",
    "rewards:redeem",
    "leaderboard:read",
    "achievements:read",
    "bottle:submit",
    "notifications:read:own",
  ],
} as const;

export function hasPermission(role: RoleName, permission: string): boolean {
  return (rolePermissions[role] as readonly string[]).includes(permission);
}
