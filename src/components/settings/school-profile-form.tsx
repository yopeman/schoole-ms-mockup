"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SchoolProfile } from "@/types";
import { SectionCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { seed } from "@/lib/mock/seed";

type Draft = Omit<SchoolProfile, "id" | "createdAt" | "updatedAt">;

export function SchoolProfileForm() {
  const { can } = useSession();
  const canEdit = can("settings.manage");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const profile = seed.schoolProfile;
    setDraft({
      name: profile.name,
      shortName: profile.shortName,
      tagline: profile.tagline,
      address: profile.address,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      logoUrl: profile.logoUrl,
      principalName: profile.principalName,
      establishedYear: profile.establishedYear,
      registrationNumber: profile.registrationNumber,
    });
  }, []);

  if (!draft) return <p className="text-muted-foreground py-6 text-sm">Loading school profile...</p>;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    setPending(true);
    await db.updateSingleton<SchoolProfile>("schoolProfile", draft);
    setPending(false);
    toast.success("School profile updated", { description: "Changes apply to the portal header and notices." });
  };

  return (
    <SectionCard
      title="School Profile"
      description="Shown across the portal and on generated documents"
      action={
        canEdit ? (
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School name">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Short name">
          <Input value={draft.shortName} onChange={(e) => set("shortName", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Principal">
          <Input value={draft.principalName} onChange={(e) => set("principalName", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Registration number">
          <Input value={draft.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Email">
          <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Phone">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Website">
          <Input value={draft.website} onChange={(e) => set("website", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Established">
          <Input
            type="number"
            value={draft.establishedYear}
            onChange={(e) => set("establishedYear", Number(e.target.value))}
            disabled={!canEdit}
          />
        </Field>
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Tagline">
          <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Address">
          <Textarea rows={2} value={draft.address} onChange={(e) => set("address", e.target.value)} disabled={!canEdit} />
        </Field>
      </div>

      {!canEdit && (
        <p className="text-muted-foreground mt-4 text-xs">
          Your role can view the school profile but not modify it.
        </p>
      )}
    </SectionCard>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);