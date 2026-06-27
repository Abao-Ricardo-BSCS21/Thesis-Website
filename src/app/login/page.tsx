"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AUTH_PENDING_KEY } from "@/lib/constants/auth";
import { formatStudentIdInput, isCompleteStudentId, normalizeStudentId, STUDENT_ID_MAX_LENGTH } from "@/lib/utils/student-id";

type LoginType = "student" | "admin" | "staff";

const loginConfig: Record<
  LoginType,
  { label: string; placeholder: string; inputType: string; inputId: string }
> = {
  student: {
    label: "Student ID",
    placeholder: "e.g. 2021-10001",
    inputType: "text",
    inputId: "identifier",
  },
  staff: {
    label: "Staff Email",
    placeholder: "staff@filamer.edu",
    inputType: "email",
    inputId: "staff-email",
  },
  admin: {
    label: "Admin Email",
    placeholder: "admin@filamer.edu",
    inputType: "email",
    inputId: "admin-email",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const config = loginConfig[loginType];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error(`Please enter your ${config.label.toLowerCase()}`);
      return;
    }
    if (loginType === "student" && !isCompleteStudentId(identifier)) {
      toast.error("Enter a valid Student ID (e.g. 2021-10001)");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      if (loginType === "student") {
        const studentId = normalizeStudentId(identifier);
        const checkRes = await fetch("/api/auth/student/login-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            password,
          }),
        });
        const checkData = await checkRes.json();

        if (!checkData.success) {
          toast.error(checkData.error || "Invalid Student ID or Password.");
          return;
        }

        if (checkData.data.requiresOtp) {
          sessionStorage.setItem(
            AUTH_PENDING_KEY,
            JSON.stringify({ studentId, password })
          );

          const params = new URLSearchParams({
            studentId: checkData.data.studentId,
            purpose: checkData.data.purpose,
            maskedPhone: checkData.data.maskedPhone,
          });
          if (checkData.data.expiresAt) params.set("expiresAt", checkData.data.expiresAt);
          if (checkData.data.resendAvailableAt) {
            params.set("resendAvailableAt", checkData.data.resendAvailableAt);
          }

          toast.info("Please verify your phone number");
          router.push(`/verify-otp?${params.toString()}`);
          return;
        }
      }

      const result = await signIn("credentials", {
        identifier: loginType === "student" ? normalizeStudentId(identifier) : identifier.trim(),
        password,
        loginType,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      if (!role) {
        toast.error("Login succeeded but session could not be loaded. Please try again.");
        return;
      }

      toast.success("Welcome back!");

      if (role === "ADMINISTRATOR") router.push("/admin");
      else if (role === "STAFF") router.push("/staff");
      else router.push("/student");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setLoginType(value as LoginType);
    setIdentifier("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(27,94,32,0.1),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        <Card className="glass border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your FilCycle account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={loginType} onValueChange={handleTabChange}>
              <TabsList className="mb-6 grid w-full grid-cols-3">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor={config.inputId}>{config.label}</Label>
                <Input
                  key={loginType}
                  id={config.inputId}
                  type={config.inputType}
                  placeholder={config.placeholder}
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(
                      loginType === "student"
                        ? formatStudentIdInput(e.target.value)
                        : e.target.value
                    )
                  }
                  autoComplete={loginType === "student" ? "username" : "email"}
                  inputMode={loginType === "student" ? "numeric" : undefined}
                  maxLength={loginType === "student" ? STUDENT_ID_MAX_LENGTH : undefined}
                  pattern={loginType === "student" ? "[0-9]{4}-[0-9]{5}" : undefined}
                  title={loginType === "student" ? "Format: 2021-10001" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-xl bg-primary/5 p-4 text-center text-xs text-muted-foreground">
              <p className="font-medium text-primary mb-1">Demo Credentials</p>
              <p>Student: 2021-10001 / student123</p>
              <p>Staff: staff@filamer.edu / staff123</p>
              <p>Admin: admin@filamer.edu / admin123</p>
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              New student?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
