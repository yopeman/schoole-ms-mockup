"use client";

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Mail, MapPin, Phone, Star } from "lucide-react";
import type { DocumentRecord, Teacher } from "@/types";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLookups, useStudentsBySection } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { dateLabel, money } from "@/lib/mock/constants";
import { TeacherFormDialog } from "../teacher-form";
import { useState } from "react";

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const { can } = useSession();
  const lookups = useLookups();
  const studentsBySection = useStudentsBySection();
  const [editing, setEditing] = useState(false);

  const teacher = lookups.teacherMap.get(params.id) as Teacher | undefined;

  if (!teacher) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Teacher not found"
        action={<Button render={<Link href="/teachers" />}>Back to teachers</Button>}
      />
    );
  }

  const classes = lookups.classes.filter((c) => teacher.classIds.includes(c.id));
  const sections = lookups.sections.filter((s) => s.teacherId === teacher.id);
  const students = sections.flatMap((s) => studentsBySection.get(s.id) ?? []);
  const documents = db.all<DocumentRecord>("documents").filter((d) => d.ownerId === teacher.id);
  const timetable = db.all<import("@/types").TimetableSlot>("timetable").filter((t) => t.teacherId === teacher.id);

  const yearsOfService = new Date().getFullYear() - Number(teacher.joinDate.slice(0, 4));

  return (
    <>
      <PageHeader
        title={`${teacher.firstName} ${teacher.lastName}`}
        description={`${teacher.employeeCode} · ${teacher.designation} · ${teacher.department}`}
        badge={<StatusBadge value={teacher.status} map={STATUS_MAPS.student} />}
        actions={
          <>
            <Button variant="outline" render={<Link href="/teachers" />}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {can("teachers.manage") && <Button onClick={() => setEditing(true)}>Edit</Button>}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Classes Assigned" value={classes.length} icon={BookOpen} tone="info" />
        <StatCard label="Students" value={students.length} hint={`${sections.length} sections`} />
        <StatCard label="Performance Rating" value={teacher.rating ? `${teacher.rating}/5` : "—"} icon={Star} tone={teacher.rating && teacher.rating >= 4 ? "positive" : "default"} />
        <StatCard label="Years of Service" value={yearsOfService} hint={`Joined ${dateLabel(teacher.joinDate)}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SectionCard title="Profile" className="lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info icon={Mail} label="Email" value={teacher.email} />
            <Info icon={Phone} label="Phone" value={teacher.phone} />
            <Info icon={MapPin} label="Address" value={teacher.address ? `${teacher.address.line1}, ${teacher.address.city}` : "—"} />
            <Info icon={BookOpen} label="Qualifications" value={teacher.qualifications.join(", ") || "—"} />
          </dl>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Subjects taught</p>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.length === 0 ? (
                  <span className="text-muted-foreground text-sm">None assigned</span>
                ) : (
                  teacher.subjects.map((id) => (
                    <Badge key={id} variant="secondary">
                      {lookups.subjectName(id)}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Classes</p>
              <div className="flex flex-wrap gap-2">
                {classes.length === 0 ? (
                  <span className="text-muted-foreground text-sm">No classes assigned</span>
                ) : (
                  classes.map((c) => (
                    <Badge key={c.id} variant="outline">
                      {c.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {teacher.rating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Performance rating</span>
                  <span className="font-medium">{teacher.rating} / 5</span>
                </div>
                <Progress value={teacher.rating * 20} />
              </div>
            )}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Employment">
            <dl className="space-y-3 text-sm">
              <Row label="Designation" value={teacher.designation} />
              <Row label="Department" value={teacher.department} />
              <Row label="Type" value={teacher.employmentType.replace("_", " ")} />
              <Row label="Monthly salary" value={money(teacher.salary)} />
              <Row label="Joined" value={dateLabel(teacher.joinDate)} />
            </dl>
          </SectionCard>

          <SectionCard title="Documents" description={`${documents.length} on file`}>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No documents uploaded</p>
            ) : (
              <ul className="divide-border divide-y">
                {documents.map((doc) => (
                  <li key={doc.id} className="py-2 text-sm first:pt-0 last:pb-0">
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-muted-foreground text-xs">{doc.sizeKb} KB · {dateLabel(doc.uploadedAt.slice(0, 10))}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Weekly Load" description={`${timetable.length} periods assigned`}>
            <ul className="space-y-1.5 text-sm">
              {[1, 2, 3, 4, 5].map((day) => {
                const count = timetable.filter((t) => t.dayOfWeek === day).length;
                return (
                  <li key={day} className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][day - 1]}
                    </span>
                    <span className="font-medium">{count} periods</span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>
      </div>

      <TeacherFormDialog
        open={editing}
        teacher={teacher}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          window.location.reload();
        }}
      />
    </>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
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
    <dt className="text-muted-foreground capitalize">{label}</dt>
    <dd className="text-right font-medium">{value}</dd>
  </div>
);