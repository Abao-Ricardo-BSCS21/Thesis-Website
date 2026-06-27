import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  loginType: z.enum(["student", "admin", "staff"]).default("student"),
});

export const bottleSubmissionSchema = z.object({
  studentId: z.string().optional(),
  weightGrams: z.number().min(1).max(500).optional(),
  material: z.string().default("PET"),
});

export const rewardRedemptionSchema = z.object({
  rewardId: z.string().min(1),
});

export const rewardCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    "COFFEE_VOUCHER",
    "MERCHANDISE",
    "CASH",
    "UNIVERSITY_POINTS",
    "GIFT_CARD",
  ]),
  pointsCost: z.number().min(1),
  stock: z.number().min(0),
  imageUrl: z.string().optional(),
});

export const studentCreateSchema = z.object({
  studentId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  course: z.string().min(1),
  year: z.number().min(1).max(6),
  password: z.string().min(6),
});

export const studentUpdateSchema = z.object({
  studentId: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  course: z.string().min(1).optional(),
  year: z.number().min(1).max(6).optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  rewardPoints: z.number().min(0).optional(),
  bottlesRecycled: z.number().min(0).optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMINISTRATOR", "STAFF"]),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMINISTRATOR", "STAFF"]).optional(),
});

export const userCreateWithRoleSchema = z.discriminatedUnion("role", [
  studentCreateSchema.extend({ role: z.literal("STUDENT") }),
  userCreateSchema,
]);

export const redemptionStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "FULFILLED"]),
});

export const reportQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
  format: z.enum(["json", "pdf", "excel", "csv"]).default("json"),
});

export const notificationReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});

export const machineStatusSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE"]).optional(),
  bottlesStored: z.number().min(0).optional(),
  temperature: z.number().optional(),
  motorStatus: z.string().optional(),
});
