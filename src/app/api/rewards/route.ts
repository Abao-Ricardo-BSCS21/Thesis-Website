import { NextRequest, NextResponse } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  rewardCreateSchema,
  rewardRedemptionSchema,
  redemptionStatusSchema,
} from "@/lib/validations";
import { NotificationType } from "@prisma/client";
import { studentAuthService } from "@/services/auth/student-auth.service";
import { webhookDispatcher } from "@/services/webhook/webhook-dispatcher.service";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
    RoleName.STUDENT,
  ]);
  if (error) return error;

  const rewards = await prisma.reward.findMany({
    where: { isActive: true },
    orderBy: { pointsCost: "asc" },
  });

  return apiResponse(rewards);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = rewardCreateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const reward = await prisma.reward.create({ data: parsed.data });
  return apiResponse(reward, 201);
}

export async function PUT(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([
    RoleName.STUDENT,
    RoleName.STAFF,
    RoleName.ADMINISTRATOR,
  ]);
  if (error) return error;

  const body = await parseBody(request);
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "redeem") {
    const parsed = rewardRedemptionSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const student = await prisma.student.findFirst({
      where: { userId: session!.user.id },
      include: { user: { select: { email: true } } },
    });
    if (!student) return apiError("Student not found", 404);

    const hasOtpVerification = await studentAuthService.hasActionVerification(
      student.id,
      "REWARD_REDEMPTION"
    );
    if (!hasOtpVerification) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP verification required for reward redemption",
          code: "OTP_REQUIRED",
        },
        { status: 403 }
      );
    }

    const reward = await prisma.reward.findUnique({
      where: { id: parsed.data.rewardId },
    });
    if (!reward || !reward.isActive) return apiError("Reward not found", 404);
    if (reward.stock <= 0) return apiError("Reward out of stock", 400);
    if (student.rewardPoints < reward.pointsCost) {
      return apiError("Insufficient points", 400);
    }

    const redemption = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: student.id },
        data: { rewardPoints: { decrement: reward.pointsCost } },
      });

      await tx.reward.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } },
      });

      const r = await tx.rewardRedemption.create({
        data: {
          studentId: student.id,
          rewardId: reward.id,
          pointsUsed: reward.pointsCost,
        },
        include: { reward: true },
      });

      await tx.notification.create({
        data: {
          userId: student.userId,
          title: "Reward Claimed!",
          message: `You redeemed "${reward.name}" for ${reward.pointsCost} points.`,
          type: NotificationType.REWARD_CLAIMED,
        },
      });

      return r;
    });

    webhookDispatcher.dispatchAsync("EMAIL", "REWARD_REDEMPTION", {
      studentId: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      email: student.user.email,
      rewardName: reward.name,
      pointsUsed: reward.pointsCost,
      redemptionId: redemption.id,
      message: `You redeemed "${reward.name}" for ${reward.pointsCost} points.`,
      subject: "FilCycle Reward Redeemed",
    });

    return apiResponse(redemption);
  }

  if (action === "approve") {
    const { error: staffError, session: staffSession } = await requireAuth([
      RoleName.STAFF,
      RoleName.ADMINISTRATOR,
    ]);
    if (staffError) return staffError;

    const parsed = redemptionStatusSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const redemptionId = searchParams.get("id");
    if (!redemptionId) return apiError("Redemption ID required");

    const redemption = await prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: {
        status: parsed.data.status,
        approvedBy: staffSession!.user.email ?? staffSession!.user.id,
      },
      include: { reward: true, student: true },
    });

    return apiResponse(redemption);
  }

  return apiError("Invalid action", 400);
}
