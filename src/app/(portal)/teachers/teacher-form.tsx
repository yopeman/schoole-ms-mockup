"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import type { Teacher } from "@/types";
import { db } from "@/lib/mock/server";
import { useLookups } from "@/hooks/use-lookups";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  dateOfBirth: z.string().min(4),
  designation: z.string().min(2),
  department: z.string().min(2),
  employmentType: z.enum(["full_time", "part_time", "contract", "visiting"]),
  salary: z.coerce.number().min(0),
  joinDate: z.string().min(4),
  status: z.enum(["active", "inactive", "archived"]),
  qualifications: z.string().optional(),
});

type Values = z.infer<typeof schema>;

const empty = (): Values => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "1992-04-12",
  designation: "Teacher",
  department: "Mathematics",
  employmentType: "full_time",
  salary: 50000,
  joinDate: "2024-06-01",
  status: "active",
  qualifications: "B.Sc., B.Ed.",
});

export function TeacherFormDialog({
  open,
  teacher,
  onClose,
  onSaved,
}: {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const lookups = useLookups();
  const [values, setValues] = useState<Values>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(
      teacher
        ? {
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email,
            phone: teacher.phone,
            dateOfBirth: teacher.dateOfBirth,
            designation: teacher.designation,
            department: teacher.department,
            employmentType: teacher.employmentType,
            salary: teacher.salary,
            joinDate: teacher.joinDate,
            status: teacher.status,
            qualifications: teacher.qualifications.join(", "),
          }
        : empty(),
    );
  }, [open, teacher]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const issue of parsed.error.issues) flat[String(issue.path[0])] = issue.message;
      setErrors(flat);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setPending(true);
    const data = parsed.data;
    const payload = {
      ...data,
      qualifications: data.qualifications
        ? data.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
        : [],
    };

    if (teacher) {
      await db.update<Teacher>("teachers", teacher.id, payload);
      toast.success("Teacher updated", { description: `${data.firstName} ${data.lastName}` });
    } else {
      await db.create<Teacher>("teachers", {
        ...payload,
        employeeCode: `EMP${Date.now().toString().slice(-4)}`,
        subjects: [],
        classIds: [],
        rating: 4,
      } as never);
      toast.success("Teacher added", { description: `${data.firstName} ${data.lastName}` });
    }

    setPending(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit teacher" : "Add teacher"}</DialogTitle>
          <DialogDescription>
            {teacher ? `Updating ${teacher.firstName} ${teacher.lastName}` : "Create a new teaching staff record."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName}>
              <Input value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <Input value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input value={values.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Date of birth" error={errors.dateOfBirth}>
              <Input type="date" value={values.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Joining date" error={errors.joinDate}>
              <Input type="date" value={values.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Designation" error={errors.designation}>
              <Input value={values.designation} onChange={(e) => set("designation", e.target.value)} />
            </Field>
            <Field label="Department" error={errors.department}>
              <Select value={values.department} onValueChange={(v) => set("department", String(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Mathematics", "Science", "English", "Humanities", "Computer Science", "Physical Education", "Social Studies", "Commerce"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment type" error={errors.employmentType}>
              <Select value={values.employmentType} onValueChange={(v) => set("employmentType", v as Values["employmentType"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["full_time", "part_time", "contract", "visiting"].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Monthly salary" error={errors.salary}>
              <Input type="number" min={0} value={values.salary} onChange={(e) => set("salary", Number(e.target.value))} />
            </Field>
            <Field label="Status" error={errors.status}>
              <Select value={values.status} onValueChange={(v) => set("status", v as Values["status"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Qualifications">
              <Textarea rows={2} value={values.qualifications ?? ""} onChange={(e) => set("qualifications", e.target.value)} />
            </Field>
          </div>

          {!teacher && (
            <p className="text-muted-foreground text-xs">
              Subjects and class assignments can be configured after the teacher is created. Known subjects:{" "}
              {lookups.subjects.length}.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : teacher ? "Save changes" : "Add teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}