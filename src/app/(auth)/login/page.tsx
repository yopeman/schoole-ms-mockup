"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import type { AppUser, Role } from "@/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { seed } from "@/lib/mock/seed";
import { MOCK_PASSWORD } from "@/lib/mock/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["admin", "director", "teacher", "student", "family", "staff", "accountant"];

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const { login } = useSession();

  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(() => db.all<AppUser>("users").find((u) => u.role === "admin")?.email ?? "");
  const [password, setPassword] = useState(MOCK_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pickRole = (nextRole: Role) => {
    setRole(nextRole);
    const persona = db.all<AppUser>("users").find((u) => u.role === nextRole);
    if (persona) setEmail(persona.email);
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await login(email, password);
    setPending(false);
    if (result.ok) router.push(next);
    else setError(result.error ?? "Unable to sign in");
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Logo className="bg-primary-foreground/15" />
          <div>
            <p className="font-semibold">{seed.schoolProfile.name}</p>
            <p className="text-sm opacity-80">{seed.schoolProfile.tagline}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl leading-tight font-semibold">
            One portal for academics, attendance, results and finance.
          </h1>
          <ul className="space-y-3 text-sm opacity-90">
            <li>• Role-based dashboards for administrators, teachers, students and parents</li>
            <li>• Attendance registers, timetables, exams and report cards</li>
            <li>• Fees, invoices, payroll and financial reporting</li>
          </ul>
        </div>

        <p className="text-xs opacity-70">
          Academic Year 2026-27 · {seed.schoolProfile.address}
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo />
            <div>
              <p className="font-semibold">{seed.schoolProfile.name}</p>
              <p className="text-muted-foreground text-sm">Management Portal</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Sign in
              </CardTitle>
              <CardDescription>
                This is a frontend demo. Pick a persona and sign in with the pre-filled password.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ROLES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => pickRole(item)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                          role === item
                            ? "border-primary bg-primary/5 text-primary"
                            : "hover:bg-accent",
                        )}
                      >
                        {ROLE_LABELS[item]}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[role]}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Signing in..." : "Sign in"}
                  {!pending && <ArrowRight className="size-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <GraduationCap className="size-3.5" />
            Mock data only — no backend or database is connected.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}