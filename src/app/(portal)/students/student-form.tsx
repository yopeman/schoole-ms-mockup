"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import type { GradeLevel, Guardian, Student } from "@/types";
import { db } from "@/lib/mock/server";
import { useLookups } from "@/hooks/use-lookups";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(4, "Date of birth is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().min(1, "Select a section"),
  rollNumber: z.string().min(1, "Roll number is required"),
  status: z.enum(["active", "inactive", "graduated", "transferred"]),
  category: z.enum(["general", "sc", "st", "obc", "ews"]),
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianPhone: z.string().min(6, "Enter a valid phone number"),
  guardianRelation: z.enum(["father", "mother", "brother", "sister", "grandparent", "uncle", "aunt", "other"]),
  address: z.string().optional(),
  medicalNotes: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  scholarship: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues = (): FormValues => ({
  firstName: "",
  lastName: "",
  gender: "male",
  dateOfBirth: "2015-06-15",
  email: "",
  phone: "",
  classId: "",
  sectionId: "",
  rollNumber: "",
  status: "active",
  category: "general",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "father",
  address: "",
  medicalNotes: "",
  discountPercent: 0,
  scholarship: false,
});

export function StudentFormDialog({
  open,
  student,
  onClose,
  onSaved,
}: {
  open: boolean;
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const lookups = useLookups();
  const [values, setValues] = useState<FormValues>(emptyValues());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!student) {
      setValues(emptyValues());
      return;
    }
    const guardian = student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];
    setValues({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      email: student.email,
      phone: student.phone,
      classId: student.classId,
      sectionId: student.sectionId,
      rollNumber: student.rollNumber,
      status: student.status,
      category: student.category,
      guardianName: guardian ? `${guardian.firstName} ${guardian.lastName}` : "",
      guardianPhone: guardian?.phone ?? "",
      guardianRelation: (guardian?.relation ?? "father") as FormValues["guardianRelation"],
      address: student.address ? `${student.address.line1}, ${student.address.city}` : "",
      medicalNotes: student.medicalNotes ?? "",
      discountPercent: student.discountPercent ?? 0,
      scholarship: student.scholarship ?? false,
    });
  }, [open, student]);

  const sections = useMemo(
    () => lookups.sections.filter((s) => !values.classId || s.classId === values.classId),
    [lookups.sections, values.classId],
  );

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
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
    const [guardianFirst, ...guardianRest] = data.guardianName.trim().split(/\s+/);

    const guardians: Guardian[] = [
      {
        id: student?.guardians[0]?.id ?? `g-${Date.now()}`,
        firstName: guardianFirst,
        lastName: guardianRest.join(" ") || guardianFirst,
        relation: data.guardianRelation,
        gender: data.guardianRelation === "mother" || data.guardianRelation === "sister" || data.guardianRelation === "aunt" ? "female" : "male",
        phone: data.guardianPhone,
        isPrimary: true,
      },
      ...(student?.guardians.filter((g) => !g.isPrimary) ?? []),
    ];

    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      email: data.email,
      phone: data.phone,
      classId: data.classId,
      sectionId: data.sectionId,
      rollNumber: data.rollNumber,
      status: data.status,
      category: data.category,
      guardians,
      address: data.address
        ? { line1: data.address, city: "", state: "", postalCode: "", country: "India" }
        : undefined,
      medicalNotes: data.medicalNotes || undefined,
      discountPercent: data.discountPercent,
      scholarship: data.scholarship,
      admissionStatus: "enrolled" as const,
    };

    if (student) {
      await db.update<Student>("students", student.id, payload);
      toast.success("Student updated", { description: `${data.firstName} ${data.lastName}` });
    } else {
      await db.create<Student>("students", {
        ...payload,
        studentCode: `SIS${Date.now().toString().slice(-5)}`,
        admissionDate: new Date().toISOString().slice(0, 10),
      } as never);
      toast.success("Student enrolled", { description: `${data.firstName} ${data.lastName}` });
    }

    setPending(false);
    onSaved();
  };

  const error = (key: keyof FormValues) => errors[key];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Enroll new student"}</DialogTitle>
          <DialogDescription>
            {student ? `Updating ${student.firstName} ${student.lastName}` : "Add a student to the school roll."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Personal details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" error={error("firstName")}>
                <Input value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </Field>
              <Field label="Last name" error={error("lastName")}>
                <Input value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </Field>
              <Field label="Gender" error={error("gender")}>
                <Select value={values.gender} onValueChange={(v) => set("gender", v as FormValues["gender"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth" error={error("dateOfBirth")}>
                <Input type="date" value={values.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
              </Field>
              <Field label="Email" error={error("email")}>
                <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Phone" error={error("phone")}>
                <Input value={values.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Enrollment</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Class" error={error("classId")}>
                <Select
                  value={values.classId}
                  onValueChange={(v) => {
                    set("classId", String(v));
                    set("sectionId", "");
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {lookups.classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Section" error={error("sectionId")}>
                <Select value={values.sectionId} onValueChange={(v) => set("sectionId", String(v))} disabled={!values.classId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Roll number" error={error("rollNumber")}>
                <Input value={values.rollNumber} onChange={(e) => set("rollNumber", e.target.value)} />
              </Field>
              <Field label="Category" error={error("category")}>
                <Select value={values.category} onValueChange={(v) => set("category", v as FormValues["category"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general", "sc", "st", "obc", "ews"].map((c) => (
                      <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status" error={error("status")}>
                <Select value={values.status} onValueChange={(v) => set("status", v as FormValues["status"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fee discount (%)" error={error("discountPercent")}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={values.discountPercent ?? 0}
                  onChange={(e) => set("discountPercent", Number(e.target.value))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={values.scholarship}
                onCheckedChange={(checked) => set("scholarship", checked === true)}
              />
              Receives scholarship
            </label>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Guardian</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guardian name" error={error("guardianName")}>
                <Input value={values.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
              </Field>
              <Field label="Relation" error={error("guardianRelation")}>
                <Select value={values.guardianRelation} onValueChange={(v) => set("guardianRelation", v as FormValues["guardianRelation"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["father", "mother", "brother", "sister", "grandparent", "uncle", "aunt", "other"].map((r) => (
                      <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Guardian phone" error={error("guardianPhone")}>
                <Input value={values.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} />
              </Field>
              <Field label="Address">
                <Textarea value={values.address} onChange={(e) => set("address", e.target.value)} rows={2} />
              </Field>
            </div>
            <Field label="Medical notes">
              <Textarea value={values.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} rows={2} />
            </Field>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : student ? "Save changes" : "Enroll student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export const gradeLevelOptions = (levels: { id: string; gradeLevel: GradeLevel }[]): { value: string; label: string }[] =>
  levels.map((l) => ({ value: l.id, label: `Grade ${l.gradeLevel}` }));