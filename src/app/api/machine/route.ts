import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { machineStatusSchema } from "@/lib/validations";
import { hardware } from "@/lib/hardware";
import { logMachineEvent, notifyAdmins } from "@/lib/services/recycling-service";
import { LogLevel, NotificationType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
  ]);
  if (error) return error;

  const machines = await prisma.machine.findMany({
    include: {
      logs: { take: 10, orderBy: { createdAt: "desc" } },
      _count: { select: { transactions: true } },
    },
  });

  const hwStatus = await hardware.machineController.getStatus();

  return apiResponse({ machines, hardware: hwStatus });
}

export async function PUT(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = machineStatusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get("id");
  if (!machineId) return apiError("Machine ID required");

  const machine = await prisma.machine.update({
    where: { id: machineId },
    data: parsed.data,
  });

  if (parsed.data.status === "OFFLINE") {
    await notifyAdmins(
      "Machine Offline",
      `${machine.name} at ${machine.location} is now offline.`,
      NotificationType.MACHINE_OFFLINE
    );
  }

  return apiResponse(machine);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get("id");
  if (!machineId) return apiError("Machine ID required");

  const hwStatus = await hardware.machineController.getStatus();
  const storagePercent =
    (hwStatus.storageLevel / hwStatus.storageCapacity) * 100;

  if (storagePercent > 90) {
    await notifyAdmins(
      "Storage Almost Full",
      `Machine storage is at ${Math.round(storagePercent)}% capacity.`,
      NotificationType.STORAGE_FULL
    );
  }

  const sensorErrors = Object.entries(hwStatus.sensors)
    .filter(([, status]) => status === "error")
    .map(([name]) => name);

  if (sensorErrors.length > 0) {
    await logMachineEvent(
      machineId,
      `Sensor errors detected: ${sensorErrors.join(", ")}`,
      LogLevel.ERROR,
      { sensors: hwStatus.sensors }
    );
    await notifyAdmins(
      "Sensor Error",
      `Sensors reporting errors: ${sensorErrors.join(", ")}`,
      NotificationType.SENSOR_ERROR
    );
  }

  return apiResponse({ hardware: hwStatus, storagePercent });
}
