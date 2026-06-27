import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { RoleName } from "@prisma/client";
import { authConfig } from "./auth.config";

export const authOptions: NextAuthOptions = {
  ...authConfig,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Student ID", type: "text" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Please enter your credentials");
        }

        const loginType = credentials.loginType || "student";

        if (loginType === "student") {
          const student = await prisma.student.findUnique({
            where: { studentId: credentials.identifier },
            include: { user: { include: { role: true } } },
          });

          if (!student) {
            throw new Error("Invalid Student ID or Password.");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            student.user.password
          );

          if (!isValid) {
            throw new Error("Invalid Student ID or Password.");
          }

          if (!student.emailVerified || !student.user.isActive) {
            throw new Error("Please verify your email to continue.");
          }

          return {
            id: student.user.id,
            email: student.user.email,
            role: student.user.role.name,
            studentId: student.studentId,
            name: `${student.firstName} ${student.lastName}`,
            image: student.profilePicture,
          };
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.identifier },
          include: { role: true, student: true },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid email or password");
        }

        if (user.role.name === RoleName.STUDENT) {
          throw new Error("Students must login with Student ID");
        }

        if (loginType === "admin" && user.role.name !== RoleName.ADMINISTRATOR) {
          throw new Error("This account is not an administrator");
        }

        if (loginType === "staff" && user.role.name !== RoleName.STAFF) {
          throw new Error("This account is not a staff member");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role.name,
          name: user.student
            ? `${user.student.firstName} ${user.student.lastName}`
            : user.email,
          image: user.student?.profilePicture,
        };
      },
    }),
  ],
};

export { getDashboardPath } from "./auth.config";
