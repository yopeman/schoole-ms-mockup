import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { seed } from "@/lib/mock/seed";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { number } from "@/lib/mock/constants";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Role-aware dashboards",
    body: "Seven distinct dashboards that scope themselves to what each persona is allowed to see — no configuration required.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance & registers",
    body: "Mark a class in seconds with bulk actions, then review 30-day trends, risk lists and monthly grids.",
  },
  {
    icon: BarChart3,
    title: "Exams & report cards",
    body: "Build exam schedules, enter marks per class and subject, and publish results straight to students and parents.",
  },
  {
    icon: IndianRupee,
    title: "Fees & payroll",
    body: "Invoices, receipts, concessions, salary disbursement and an expense approval queue with live collection tracking.",
  },
  {
    icon: Megaphone,
    title: "Notices & messaging",
    body: "Target announcements to students, parents, teachers or staff, and hold two-way conversations in one inbox.",
  },
  {
    icon: ShieldCheck,
    title: "Built for demos",
    body: "Deterministic seed data means every chart, grade and balance stays identical on every reload.",
  },
];

const MODULES = [
  { href: "/students", label: "Students" },
  { href: "/teachers", label: "Teachers" },
  { href: "/families", label: "Families" },
  { href: "/staff", label: "Staff" },
  { href: "/admissions", label: "Admissions" },
  { href: "/academics/classes", label: "Classes" },
  { href: "/academics/subjects", label: "Subjects" },
  { href: "/timetable", label: "Timetable" },
  { href: "/attendance", label: "Attendance" },
  { href: "/exams", label: "Exams & Results" },
  { href: "/finance/fees", label: "Fees & Invoices" },
  { href: "/finance/payroll", label: "Payroll" },
  { href: "/finance/expenses", label: "Expenses" },
  { href: "/assets", label: "Asset Register" },
  { href: "/announcements", label: "Announcements" },
  { href: "/messages", label: "Messages" },
  { href: "/events", label: "Events" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

const ROLES: Role[] = ["admin", "director", "teacher", "student", "family", "staff", "accountant"];

const STATS = [
  { label: "Students enrolled", value: number(seed.students.filter((s) => s.status === "active").length) },
  { label: "Teaching staff", value: number(seed.teachers.length) },
  { label: "Feature routes", value: String(MODULES.length) },
  { label: "Personas", value: String(ROLES.length) },
];

export default function LandingPage() {
  const profile = seed.schoolProfile;

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Schoole MS</p>
              <p className="text-muted-foreground truncate text-xs">{profile.shortName} Management Portal</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="hover:text-foreground text-muted-foreground transition-colors">
              Features
            </a>
            <a href="#roles" className="hover:text-foreground text-muted-foreground transition-colors">
              Roles
            </a>
            <a href="#modules" className="hover:text-foreground text-muted-foreground transition-colors">
              Modules
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button render={<Link href="/dashboard" />}>
              Get started
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="from-primary/5 to-background bg-gradient-to-b">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-16 sm:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary" className="mb-6 gap-1.5">
                <Sparkles className="size-3" />
                Frontend demo · no backend required
              </Badge>

              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                Every part of school operations, in one portal
              </h1>

              <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-lg text-balance">
                Students, staff, academics, attendance, results and finance — with a dashboard and a permission set
                tailored to each of the seven roles that run a school.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/dashboard" />}>
                  Get started
                  <ArrowRight className="size-4" />
                </Button>
                <Button size="lg" variant="outline" render={<Link href="/login" />}>
                  <CheckCircle2 className="size-4" />
                  Try a persona
                </Button>
              </div>

              <p className="text-muted-foreground mt-4 text-xs">
                No sign-up needed — pick any role and sign in with <code className="bg-muted rounded px-1.5 py-0.5">demo1234</code>
              </p>
            </div>

            <dl className="mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl border p-5 text-center">
                  <dt className="text-muted-foreground text-sm">{stat.label}</dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Built for the whole school</h2>
              <p className="text-muted-foreground mt-3">
                Academic and administrative workflows that share one data model, so a mark entered by a teacher shows up
                in the parent portal, the report card and the dashboard.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="hover:border-primary/40 rounded-xl border p-6 transition-colors">
                  <div className="bg-primary/10 text-primary mb-4 flex size-11 items-center justify-center rounded-lg">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="bg-muted/30 scroll-mt-20 border-t">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Seven roles, seven portals</h2>
              <p className="text-muted-foreground mt-3">
                Sign in as any persona to see how the same data model reshapes itself around what that person is
                responsible for.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((role) => (
                <Link
                  key={role}
                  href="/login"
                  className="bg-card hover:border-primary/40 group rounded-xl border p-5 transition-colors"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Users className="text-primary size-5" />
                    <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="font-medium">{ROLE_LABELS[role]}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm">{ROLE_DESCRIPTIONS[role]}</p>
                </Link>
              ))}

              <div className="bg-primary/5 border-primary/20 flex flex-col justify-center rounded-xl border p-5">
                <p className="text-sm font-medium">Signed in as admin?</p>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  Use the avatar menu to jump between personas without signing out.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="scroll-mt-20 border-t">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-20">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {MODULES.length} modules, all connected
                </h2>
                <p className="text-muted-foreground mt-3">
                  Explore the full portal. Every module supports filtering, sorting, CSV export and role-based
                  visibility.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button render={<Link href="/dashboard" />}>
                    Get started
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button variant="outline" render={<Link href="/login" />}>
                    Sign in
                  </Button>
                </div>
              </div>

              <ul className="grid gap-2 sm:grid-cols-2">
                {MODULES.map((module) => (
                  <li key={module.href}>
                    <Link
                      href={module.href}
                      className="hover:border-primary/40 hover:bg-accent/40 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                    >
                      <GraduationCap className="text-muted-foreground size-4 shrink-0" />
                      {module.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="bg-primary mx-auto my-16 w-[calc(100%-3rem)] max-w-[1440px] rounded-2xl px-6 py-14 text-center text-primary-foreground">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Ready to walk through the school?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Pick a persona and explore {profile.name} end to end. Every change you make stays in your browser.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" render={<Link href="/dashboard" />}>
                Get started
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                render={<Link href="/login" />}
              >
                Choose a persona
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <School className="size-4" />
            <span>
              {profile.name} · Academic Year 2026-27
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Built with Next.js &amp; Tailwind
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Mock data only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}