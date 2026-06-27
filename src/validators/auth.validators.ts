import { z } from "zod";
import { isValidPhoneNumber } from "@/lib/utils/phone";
import { STUDENT_ID_PATTERN } from "@/lib/utils/student-id";

const phoneSchema = z
  .string()
  .min(10, "Phone number is required")
  .refine(isValidPhoneNumber, "Invalid Philippine phone number (e.g. 09171234567)");

export const studentRegistrationSchema = z
  .object({
    studentId: z
      .string()
      .min(1, "Student ID is required")
      .regex(STUDENT_ID_PATTERN, "Student ID format: YYYY-XXXXX (e.g. 2021-10001)"),
    fullName: z.string().min(2, "Full name is required").max(100),
    course: z.string().min(1, "Course is required"),
    year: z.coerce.number().min(1).max(6),
    phoneNumber: phoneSchema,
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const studentLoginCheckSchema = z.object({
  studentId: z.string().min(1),
  password: z.string().min(1),
});

export const otpVerifySchema = z.object({
  studentId: z.string().min(1),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
  purpose: z
    .enum([
      "REGISTRATION",
      "PHONE_VERIFICATION",
      "REWARD_REDEMPTION",
      "CHANGE_PHONE",
      "RESET_PASSWORD",
      "NEW_DEVICE",
    ])
    .default("REGISTRATION"),
});

export const otpResendSchema = z.object({
  studentId: z.string().min(1),
  purpose: z
    .enum([
      "REGISTRATION",
      "PHONE_VERIFICATION",
      "REWARD_REDEMPTION",
      "CHANGE_PHONE",
      "RESET_PASSWORD",
      "NEW_DEVICE",
    ])
    .default("REGISTRATION"),
});

export const otpActionRequestSchema = z.object({
  purpose: z.enum([
    "REWARD_REDEMPTION",
    "CHANGE_PHONE",
    "RESET_PASSWORD",
    "NEW_DEVICE",
  ]),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type OtpResendInput = z.infer<typeof otpResendSchema>;
