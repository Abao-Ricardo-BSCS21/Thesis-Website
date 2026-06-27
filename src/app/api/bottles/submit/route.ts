import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { hardware } from "@/lib/hardware";
import { processBottleSubmission, logMachineEvent } from "@/lib/services/recycling-service";
import prisma from "@/lib/prisma";
import { bottleSubmissionSchema } from "@/lib/validations";
import { LogLevel } from "@prisma/client";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.STUDENT]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = bottleSubmissionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const student = await prisma.student.findFirst({
    where: { userId: session!.user.id },
  });

  if (!student) return apiError("Student profile not found", 404);

  const machine = await prisma.machine.findFirst({ where: { status: "ONLINE" } });

  if (!machine) {
    return apiError("No online machines available", 503);
  }

  if (machine.bottlesStored >= machine.bottleCapacity) {
    return apiError("Machine storage is full", 503);
  }

  const validation = await hardware.bottleValidator.validate();

  if (!validation.isValid) {
    await hardware.machineController.rejectBottle();
    await logMachineEvent(
      machine.id,
      `Bottle rejected for student ${student.studentId}: invalid material`,
      LogLevel.WARNING,
      { validation: JSON.parse(JSON.stringify(validation)) }
    );
    return apiError("Bottle rejected — invalid material or weight", 422);
  }

  await hardware.machineController.acceptBottle();

  const result = await processBottleSubmission(
    student.id,
    machine.id,
    validation.weightGrams
  );

  await logMachineEvent(
    machine.id,
    `Bottle accepted from ${student.firstName} ${student.lastName} (${student.studentId})`,
    LogLevel.INFO,
    { validation: JSON.parse(JSON.stringify(validation)), transactionId: result.transaction.id }
  );

  const updatedStudent = await prisma.student.findUnique({
    where: { id: student.id },
    include: {
      achievements: {
        include: { achievement: true },
        orderBy: { unlockedAt: "desc" },
        take: 1,
      },
    },
  });

  return apiResponse({
    accepted: true,
    pointsEarned: result.transaction.pointsEarned,
    totalPoints: updatedStudent?.rewardPoints,
    totalBottles: updatedStudent?.bottlesRecycled,
    weightGrams: validation.weightGrams,
    newAchievement: updatedStudent?.achievements[0]?.achievement ?? null,
  });
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.STUDENT,
    RoleName.STAFF,
    RoleName.ADMINISTRATOR,
  ]);
  if (error) return error;

  const hwStatus = await hardware.machineController.getStatus();

  return apiResponse({
    hardware: hwStatus,
    nfcConnected: await hardware.nfcReader.isConnected(),
  });
}
