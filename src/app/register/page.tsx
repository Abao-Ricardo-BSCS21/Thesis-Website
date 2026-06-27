"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AUTH_PENDING_KEY } from "@/lib/constants/auth";
import { formatStudentIdInput, STUDENT_ID_MAX_LENGTH } from "@/lib/utils/student-id";

const COURSES = [
  "BS Computer Science",
  "BS Information Technology",
  "BS Computer Engineering",
  "BS Environmental Science",
  "BS Information Systems",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    fullName: "",
    course: COURSES[0],
    year: "1",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Registration failed");
        return;
      }

      sessionStorage.setItem(
        AUTH_PENDING_KEY,
        JSON.stringify({ studentId: form.studentId, password: form.password })
      );

      toast.success("Registration successful! Check your email for the verification code.");

      const params = new URLSearchParams({
        studentId: form.studentId,
        purpose: "REGISTRATION",
        maskedEmail: data.data.maskedEmail,
        expiresAt: data.data.expiresAt,
        resendAvailableAt: data.data.resendAvailableAt,
      });
      router.push(`/verify-otp?${params.toString()}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F172A] p-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(126,217,87,0.1),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#7ED957]/10">
              <UserPlus className="text-[#7ED957]" size={24} />
            </div>
            <CardTitle className="text-2xl text-white">Student Registration</CardTitle>
            <CardDescription className="text-slate-400">
              Create your FilCycle account with your university Student ID
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="studentId" className="text-slate-300">
                    Student ID
                  </Label>
                  <Input
                    id="studentId"
                    placeholder="e.g. 2024-10001"
                    value={form.studentId}
                    onChange={(e) => update("studentId", formatStudentIdInput(e.target.value))}
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    inputMode="numeric"
                    maxLength={STUDENT_ID_MAX_LENGTH}
                    pattern="[0-9]{4}-[0-9]{5}"
                    title="Format: 2021-10001"
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName" className="text-slate-300">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Juan Dela Cruz"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course" className="text-slate-300">
                    Course
                  </Label>
                  <select
                    id="course"
                    value={form.course}
                    onChange={(e) => update("course", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    {COURSES.map((c) => (
                      <option key={c} value={c} className="bg-[#1e293b]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year" className="text-slate-300">
                    Year Level
                  </Label>
                  <select
                    id="year"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((y) => (
                      <option key={y} value={y} className="bg-[#1e293b]">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-slate-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@filamer.edu"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      className="border-white/10 bg-white/5 text-white pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    className="border-white/10 bg-white/5 text-white"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#7ED957] text-[#0F172A] hover:bg-[#6bc84a] font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Creating account...
                  </>
                ) : (
                  "Register & Verify Email"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-[#7ED957] hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
