"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarRange, Database, Download, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import type { AcademicYear, AppUser, Role, Term } from "@/types";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SchoolProfileForm } from "@/components/settings/school-profile-form";
import { PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/session";
import { downloadCsv } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/mock/server";
import { TODAY, dateLabel } from "@/lib/mock/constants";

export default function SettingsPage() {
  const { can, user } = useSession();

  return (
    <>
      <PageHeader
        title="Settings"
        description="School configuration, academic calendar, roles and demo data"
        badge={<Badge variant="outline">Academic Year 2026-27</Badge>}
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">School Profile</TabsTrigger>
          <TabsTrigger value="calendar">Academic Calendar</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="data">Data & Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <SchoolProfileForm />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <AcademicCalendar canManage={can("settings.manage")} />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <RolesMatrix />
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-4">
          <DataTools currentUser={user} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ------------------------------ Calendar ------------------------------ */

const AcademicCalendar = ({ canManage }: { canManage: boolean }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  useEffect(() => {
    setYears(db.all<AcademicYear>("academicYears"));
    setTerms(db.all<Term>("terms"));
  }, []);

  const current = years.find((y) => y.isCurrent);

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Current Year" value={current?.name ?? "—"} icon={CalendarRange} tone="info" />
        <StatCard label="Terms" value={terms.length} />
        <StatCard label="Today" value={dateLabel(TODAY)} />
      </div>

      <SectionCard title="Academic Years" description="Only one year can be current at a time">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead className="text-right">Current</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">{year.name}</TableCell>
                  <TableCell>{dateLabel(year.startDate)}</TableCell>
                  <TableCell>{dateLabel(year.endDate)}</TableCell>
                  <TableCell>{year.termIds.length}</TableCell>
                  <TableCell className="text-right">
                    {year.isCurrent ? (
                      <Badge>Current</Badge>
                    ) : (
                      canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            for (const other of years.filter((y) => y.isCurrent)) {
                              await db.update<AcademicYear>("academicYears", other.id, { isCurrent: false });
                            }
                            await db.update<AcademicYear>("academicYears", year.id, { isCurrent: true });
                            toast.success(`${year.name} is now the current academic year`);
                            setYears(db.all<AcademicYear>("academicYears"));
                          }}
                        >
                          Set current
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="mt-4">
        <SectionCard title="Terms">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell>{years.find((y) => y.id === term.academicYearId)?.name ?? term.academicYearId}</TableCell>
                    <TableCell>{dateLabel(term.startDate)}</TableCell>
                    <TableCell>{dateLabel(term.endDate)}</TableCell>
                    <TableCell className="text-right">
                      {term.isCurrent ? <Badge>Current</Badge> : <span className="text-muted-foreground text-xs">Closed</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>
    </>
  );
};

/* ------------------------------- Roles ------------------------------- */

const RolesMatrix = () => {
  const roles = Object.keys(ROLE_PERMISSIONS) as Role[];
  const [showAll, setShowAll] = useState(false);

  const visiblePermissions = showAll ? PERMISSIONS : PERMISSIONS.filter((p) =>
    roles.some((role) => ROLE_PERMISSIONS[role].includes(p)),
  );

  const exportMatrix = () => {
    const csv = [
      ["Capability", ...roles.map((r) => ROLE_LABELS[r])].join(","),
      ...visiblePermissions.map((p) => [`"${p}"`, ...roles.map((r) => (ROLE_PERMISSIONS[r].includes(p) ? "yes" : ""))].join(",")),
    ].join("\n");
    downloadCsv("permissions-matrix.csv", csv);
  };

  return (
    <SectionCard
      title="Roles & Permissions"
      description="What each persona can see and do. Enforced in the UI only — not a security boundary."
      action={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="all-permissions" checked={showAll} onCheckedChange={setShowAll} />
            <Label htmlFor="all-permissions" className="text-xs">
              Show all
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={exportMatrix}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      }
    >
      <ul className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <li key={role} className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-3.5 text-primary" />
              {ROLE_LABELS[role]}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{ROLE_DESCRIPTIONS[role]}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              {ROLE_PERMISSIONS[role].length} of {PERMISSIONS.length} capabilities
            </p>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Capability</TableHead>
              {roles.map((role) => (
                <TableHead key={role} className="text-center text-xs">
                  {ROLE_LABELS[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePermissions.map((permission: Permission) => (
              <TableRow key={permission}>
                <TableCell className="sticky left-0 bg-background font-mono text-xs">{permission}</TableCell>
                {roles.map((role) => (
                  <TableCell key={role} className="text-center">
                    {ROLE_PERMISSIONS[role].includes(permission) ? (
                      <span className="text-emerald-600" aria-label="granted">
                        ✓
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40" aria-label="not granted">
                        —
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};

/* -------------------------------- Data -------------------------------- */

const DataTools = ({ currentUser }: { currentUser: AppUser | null }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const all = db.all<AppUser>("users");
    setCounts({
      students: db.all("students").length,
      teachers: db.all("teachers").length,
      staff: db.all("staff").length,
      families: db.all("families").length,
      invoices: db.all("invoices").length,
      accounts: all.length,
    });
  }, []);

  const reset = async () => {
    await db.reset();
    toast.success("Mock data reset", { description: "All edits were discarded and the seed restored." });
    setTimeout(() => window.location.reload(), 800);
  };

  const exportSeed = () => {
    const rows = Object.entries(counts);
    downloadCsv(
      "mock-data-summary.csv",
      [["Entity", "Records"], ...rows.map(([key, value]) => [key, value])].join("\n"),
    );
  };

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={counts.students ?? 0} icon={Users} tone="info" />
        <StatCard label="Teaching Staff" value={counts.teachers ?? 0} icon={Building2} />
        <StatCard label="Login Accounts" value={counts.accounts ?? 0} icon={ShieldCheck} />
      </div>

      <SectionCard
        title="Mock Data"
        description="This build runs entirely on generated data stored in your browser"
      >
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium">No backend, no database</p>
            <p className="text-muted-foreground mt-1">
              Records are generated deterministically from a seed and your edits are persisted to
              <code className="bg-background mx-1 rounded px-1.5 py-0.5 text-xs">localStorage</code>. Resetting restores the
              original dataset. Signed in as <span className="font-medium">{currentUser?.email}</span>.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Dark theme</p>
                <p className="text-muted-foreground text-xs">Toggles the colour scheme</p>
              </div>
              <Switch
                checked={dark}
                onCheckedChange={(checked) => {
                  setDark(checked);
                  document.documentElement.classList.toggle("dark", checked);
                }}
                aria-label="Dark theme"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Export dataset summary</p>
                <p className="text-muted-foreground text-xs">CSV of record counts per entity</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportSeed}>
                <Download className="size-3.5" />
                Export
              </Button>
            </div>
          </div>

          <div className="border-destructive/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Reset mock data</p>
              <p className="text-muted-foreground text-xs">Discards every create, edit and delete in this browser</p>
            </div>
            <Button variant="destructive" onClick={reset}>
              <RotateCcw className="size-4" />
              Reset data
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="mt-4">
        <SectionCard title="Test Accounts" description="Every persona signs in with the password demo1234">
          <ul className="divide-border divide-y">
            {db.all<AppUser>("users").slice(0, 8).map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <span className="min-w-0 truncate">{account.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[account.role]}</Badge>
                  <code className="text-muted-foreground text-xs">demo1234</code>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
        <Database className="size-3.5" />
        Swapping the mock gateway for REST calls means replacing <code>src/lib/mock/server.ts</code> only.
      </p>
    </>
  );
};