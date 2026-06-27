import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { notificationReadSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
    RoleName.STUDENT,
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session!.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session!.user.id, isRead: false },
  });

  return apiResponse({ notifications, unreadCount });
}

export async function PUT(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
    RoleName.STUDENT,
  ]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = notificationReadSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  if (parsed.data.markAll) {
    await prisma.notification.updateMany({
      where: { userId: session!.user.id, isRead: false },
      data: { isRead: true },
    });
  } else if (parsed.data.notificationIds?.length) {
    await prisma.notification.updateMany({
      where: {
        id: { in: parsed.data.notificationIds },
        userId: session!.user.id,
      },
      data: { isRead: true },
    });
  }

  return apiResponse({ success: true });
}
