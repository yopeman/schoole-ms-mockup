"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Cake,
  Droplet,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { DocumentRecord, Student } from "@/types";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLookups, useAttendanceSummary, useExamResults } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { lastNWeekdays } from "@/lib/mock/analytics";
import { TODAY, dateLabel, money } from "@/lib/mock/constants";
import { StudentFormDialog } from "../student-form";

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const { can, role, profileId } = useSession();
  const lookups = useLookups();
  const [editing, setEditing] = useState(false);

  const student = lookups.studentMap.get(params.id) as Student | undefined;

  const allowed = useMemo(() => {
    if (!student || role === "admin" || role === "director" || role === "staff" || role === "accountant" || role === "teacher") return true;
    if (role === "student") return student.id === profileId;
    if (role === "family") return lookups.families.some((f) => f.id === profileId && f.studentIds.includes(student.id));
    return false;
  }, [student, role, profileId, lookups.families]);

  const window30 = lastNWeekdays(TODAY, 30);
  const summary = useAttendanceSummary(student ? [student.id] : [], window30[0], window30[29]);
  const results = useExamResults("exam-unit-1", student ? [student.id] : []);

  const invoices = lookups.invoices.filter((i) => i.studentId === params.id);
  const documents = db.all<DocumentRecord>("documents").filter((d) => d.ownerId === params.id);

  if (!student || !allowed) {
    return (
      <EmptyState
        icon={UserRound}
        title="Student not available"
        description="This record does not exist or is outside your scope."
        action={<Button render={<Link href="/students" />}>Back to students</Button>}
      />
    );
  }

  const attendance = summary.get(student.id);
  const cls = lookups.classMap.get(student.classId);
  const invoiceTotal = invoices.reduce((sum, i) => sum + i.total, 0);
  const invoicePaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const bestSubject = [...results].sort((a, b) => b.percentage - a.percentage)[0];

  const promote = async () => {
    const levels = [...lookups.classes].sort((a, b) => a.gradeLevel - b.gradeLevel);
    const currentIndex = levels.findIndex((c) => c.id === student.classId);
    const next = levels[currentIndex + 1];
    if (!next) {
      toast.error("Already in the highest class");
      return;
    }
    const nextSection = lookups.sections.find((s) => s.classId === next.id);
    await db.update<Student>("students", student.id, {
      classId: next.id,
      sectionId: nextSection?.id ?? student.sectionId,
    });
    toast.success(`${student.firstName} promoted to ${next.name}`);
    window.location.reload();
  };

  return (
    <>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${student.studentCode} · ${lookups.className(student.classId)} ${lookups.sectionName(student.sectionId)} · Roll ${student.rollNumber}`}
        badge={<StatusBadge value={student.status} map={STATUS_MAPS.student} />}
        actions={
          <>
            <Button variant="outline" render={<Link href="/students" />}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {can("students.manage") && (
              <>
                <Button variant="outline" onClick={promote}>
                  Promote
                </Button>
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value={`${attendance?.percentage ?? 0}%`} tone={(attendance?.percentage ?? 0) >= 90 ? "positive" : "warning"} hint={`${attendance?.absent ?? 0} absent days`} />
        <StatCard label="Latest Average" value={results.length ? `${Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)}%` : "—"} tone="info" hint={bestSubject ? `Best: ${lookups.subjectName(bestSubject.subjectId)}` : undefined} />
        <StatCard label="Fees Paid" value={money(invoicePaid)} hint={`of ${money(invoiceTotal)}`} tone="positive" />
        <StatCard label="Age" value={`${new Date().getFullYear() - Number(student.dateOfBirth.slice(0, 4))}`} hint={`DOB ${dateLabel(student.dateOfBirth)}`} />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <SectionCard title="Personal Information" className="lg:col-span-2">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info icon={UserRound} label="Full name" value={`${student.firstName} ${student.lastName}`} />
              <Info icon={Cake} label="Date of birth" value={dateLabel(student.dateOfBirth)} />
              <Info icon={Droplet} label="Blood group" value={student.bloodGroup ?? "Not recorded"} />
              <Info icon={UserRound} label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
              <Info icon={Mail} label="Email" value={student.email} />
              <Info icon={Phone} label="Phone" value={student.phone} />
              <Info icon={MapPin} label="Address" value={student.address ? `${student.address.line1}, ${student.address.city}` : "—"} />
              <Info icon={FileText} label="Category" value={student.category.toUpperCase()} />
            </dl>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Enrollment">
              <dl className="space-y-3 text-sm">
                <Row label="Class" value={lookups.className(student.classId)} />
                <Row label="Section" value={lookups.sectionName(student.sectionId)} />
                <Row label="Class teacher" value={lookups.teacherName(cls?.homeroomTeacherId)} />
                <Row label="Room" value={cls?.room ?? "—"} />
                <Row label="Admission date" value={dateLabel(student.admissionDate)} />
                <Row label="Previous school" value={student.previousSchool ?? "—"} />
              </dl>
            </SectionCard>

            {student.medicalNotes && (
              <SectionCard title="Medical Notes">
                <p className="text-destructive flex items-start gap-2 text-sm">
                  <HeartPulse className="mt-0.5 size-4 shrink-0" />
                  {student.medicalNotes}
                </p>
              </SectionCard>
            )}

            {(student.scholarship || (student.discountPercent ?? 0) > 0) && (
              <SectionCard title="Concessions">
                <div className="space-y-2 text-sm">
                  {student.scholarship && <Badge>Scholarship holder</Badge>}
                  <Row label="Fee discount" value={`${student.discountPercent ?? 0}%`} />
                </div>
              </SectionCard>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <SectionCard title="Attendance Record" description="Last 30 school days">
            <div className="grid gap-4 sm:grid-cols-5">
              {[
                { label: "Present", value: attendance?.present ?? 0, tone: "text-emerald-600" },
                { label: "Absent", value: attendance?.absent ?? 0, tone: "text-red-600" },
                { label: "Late", value: attendance?.late ?? 0, tone: "text-amber-600" },
                { label: "On Leave", value: attendance?.onLeave ?? 0, tone: "text-blue-600" },
                { label: "Total", value: attendance?.total ?? 0, tone: "" },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  <p className={`text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Attendance rate</span>
                <span className="font-medium">{attendance?.percentage ?? 0}%</span>
              </div>
              <Progress value={attendance?.percentage ?? 0} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <SectionCard title="Unit Test I Results" description="Published results by subject">
            {results.length === 0 ? (
              <EmptyState title="No published results" description="Results appear once the exam is published." />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Subject</th>
                      <th className="px-4 py-2 text-right font-medium">Marks</th>
                      <th className="px-4 py-2 text-right font-medium">Grade</th>
                      <th className="px-4 py-2 text-right font-medium">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {results.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-2">{lookups.subjectName(row.subjectId)}</td>
                        <td className="px-4 py-2 text-right">{row.theoryMarks}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="secondary">{row.letterGrade}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right">{row.gradePoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="guardians" className="mt-4 grid gap-4 lg:grid-cols-2">
          {student.guardians.map((g) => (
            <SectionCard key={g.id} title={`${g.firstName} ${g.lastName}`} action={g.isPrimary ? <Badge>Primary</Badge> : undefined}>
              <dl className="space-y-3 text-sm">
                <Row label="Relation" value={g.relation.charAt(0).toUpperCase() + g.relation.slice(1)} />
                <Row label="Phone" value={g.phone} />
                <Row label="Email" value={g.email ?? "—"} />
                <Row label="Occupation" value={g.occupation ?? "—"} />
                <Row label="Annual income" value={g.annualIncome ? money(g.annualIncome) : "—"} />
              </dl>
            </SectionCard>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <SectionCard title="Documents" description="Uploaded records on file">
            {documents.length === 0 ? (
              <EmptyState icon={FileText} title="No documents uploaded" />
            ) : (
              <ul className="divide-border divide-y">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <FileText className="text-muted-foreground size-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {doc.sizeKb} KB · uploaded {dateLabel(doc.uploadedAt.slice(0, 10))}
                      </p>
                    </div>
                    <Button variant="ghost" size="xs" onClick={() => toast.info("Downloads are disabled in the demo")}>
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <SectionCard title="Fee Ledger" description="Invoices raised for this student">
            {invoices.length === 0 ? (
              <EmptyState title="No invoices" description="No fee invoices have been raised." />
            ) : (
              <ul className="divide-border divide-y">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{invoice.number}</p>
                      <p className="text-muted-foreground text-xs">
                        Issued {dateLabel(invoice.issuedDate)} · due {dateLabel(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money(invoice.total)}</p>
                      <p className="text-muted-foreground text-xs">Paid {money(invoice.paidAmount)}</p>
                    </div>
                    <StatusBadge value={invoice.status} map={STATUS_MAPS.invoice} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <StudentFormDialog
        open={editing}
        student={student}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          window.location.reload();
        }}
      />
    </>
  );
}

/* Small presentational helpers */
function Info({ icon: Icon, label, value }: { icon: typeof Cake; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="truncate text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium">{value}</dd>
  </div>
);

