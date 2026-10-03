"use client";

import { useState } from "react";
import { ClipboardCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { AdmissionApplicant } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { TODAY, dateLabel } from "@/lib/mock/constants";

const STAGES: AdmissionApplicant["status"][] = [
  "inquiry",
  "application",
  "under_review",
  "interview",
  "offered",
  "enrolled",
];

export default function AdmissionsPage() {
  const { can } = useSession();
  // `version` bumps whenever a stage changes, forcing a re-read of the store.
  const [, setVersion] = useState(0);
  const [selected, setSelected] = useState<AdmissionApplicant | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = can("admissions.manage");
  const applicants = db.all<AdmissionApplicant>("applicants");

  const byStage = STAGES.map((stage) => ({
    stage,
    applicants: applicants.filter((a) => a.status === stage),
  }));

  return (
    <>
      <PageHeader
        title="Admissions"
        description={`${applicants.length} applicants in the current intake`}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <UserPlus className="size-4" />
              New applicant
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Applicants" value={applicants.length} icon={ClipboardCheck} tone="info" />
        {byStage.map(({ stage, applicants: list }) => (
          <StatCard
            key={stage}
            label={stage.replace("_", " ")}
            value={list.length}
            className="capitalize"
            tone={stage === "enrolled" ? "positive" : stage === "interview" ? "warning" : "default"}
          />
        ))}
      </div>

      <div className="grid gap-3 overflow-x-auto lg:grid-cols-6">
        {byStage.map(({ stage, applicants: list }) => (
          <section key={stage} className="bg-muted/40 min-w-56 rounded-xl border p-3">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium capitalize">{stage.replace("_", " ")}</h2>
              <Badge variant="secondary">{list.length}</Badge>
            </header>

            {list.length === 0 ? (
              <p className="text-muted-foreground px-1 py-6 text-center text-xs">Empty</p>
            ) : (
              <ul className="space-y-2">
                {list.map((applicant) => (
                  <li key={applicant.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(applicant)}
                      className="hover:border-primary/40 w-full rounded-lg border bg-card p-2.5 text-left transition-colors"
                    >
                      <p className="truncate text-sm font-medium">
                        {applicant.firstName} {applicant.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        Grade {applicant.gradeLevel} · {applicant.applicationNumber}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {applicant.documents.filter((d) => !d.submitted).length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {applicant.documents.filter((d) => !d.submitted).length} doc(s) missing
                          </Badge>
                        )}
                        {applicant.score !== undefined && applicant.score >= 80 && (
                          <Badge variant="outline" className="text-[10px]">
                            Score {applicant.score}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <ApplicantDialog
        applicant={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onMoved={() => setVersion((v) => v + 1)}
      />

      <NewApplicantDialog open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); setVersion((v) => v + 1); }} />
    </>
  );
}

const ApplicantDialog = ({
  applicant,
  canManage,
  onClose,
  onMoved,
}: {
  applicant: AdmissionApplicant | null;
  canManage: boolean;
  onClose: () => void;
  onMoved: () => void;
}) => {
  if (!applicant) return null;

  const index = STAGES.indexOf(applicant.status);
  const nextStage = STAGES[index + 1];
  const previousStage = STAGES[index - 1];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {applicant.firstName} {applicant.lastName}
          </DialogTitle>
          <DialogDescription>
            {applicant.applicationNumber} · Grade {applicant.gradeLevel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge value={applicant.status} map={STATUS_MAPS.admission} />
            {applicant.score !== undefined && <Badge variant="secondary">Score {applicant.score}</Badge>}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Parent</dt>
              <dd className="font-medium">{applicant.parentName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Contact</dt>
              <dd className="font-medium">{applicant.parentPhone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Applied</dt>
              <dd className="font-medium">{dateLabel(applicant.appliedAt.slice(0, 10))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Previous school</dt>
              <dd className="font-medium">{applicant.previousSchool ?? "—"}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-sm font-medium">Documents</p>
            <ul className="space-y-1">
              {applicant.documents.map((doc) => (
                <li key={doc.name} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                  <span>{doc.name}</span>
                  <Badge variant={doc.submitted ? "outline" : "destructive"}>{doc.submitted ? "Submitted" : "Pending"}</Badge>
                </li>
              ))}
            </ul>
          </div>

          {applicant.notes && <p className="bg-muted/50 rounded-lg p-3 text-sm">{applicant.notes}</p>}
        </div>

        {canManage && (
          <DialogFooter>
            {previousStage && (
              <Button variant="outline" onClick={() => void moveFrom(applicant, previousStage, onMoved, onClose)}>
                Move back
              </Button>
            )}
            {nextStage && (
              <Button onClick={() => void moveFrom(applicant, nextStage, onMoved, onClose)}>
                Move to {nextStage.replace("_", " ")}
              </Button>
            )}
            {!nextStage && !previousStage && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

const moveFrom = async (
  applicant: AdmissionApplicant,
  status: AdmissionApplicant["status"],
  onMoved: () => void,
  onClose: () => void,
) => {
  await db.update<AdmissionApplicant>("applicants", applicant.id, { status });
  toast.success(`${applicant.firstName} moved to ${status.replace("_", " ")}`);
  onMoved();
  onClose();
};

const NewApplicantDialog = ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("1");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !parentPhone.trim()) {
      toast.error("Add the applicant's name and a parent contact");
      return;
    }

    setPending(true);
    await db.create<AdmissionApplicant>("applicants", {
      applicationNumber: `ADM/26/${String(Date.now()).slice(-3)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: "male",
      dateOfBirth: "2016-01-01",
      gradeLevel: Number(gradeLevel) as AdmissionApplicant["gradeLevel"],
      parentName: parentName.trim() || `${firstName} ${lastName}`,
      parentPhone: parentPhone.trim(),
      status: "inquiry",
      appliedAt: `${TODAY}T10:00:00.000Z`,
      documents: [
        { name: "Birth Certificate", submitted: false },
        { name: "Previous School TC", submitted: false },
        { name: "Passport Size Photo", submitted: false },
      ],
    } as never);

    setPending(false);
    setFirstName("");
    setLastName("");
    setParentName("");
    setParentPhone("");
    toast.success("Applicant added", { description: "Logged as an inquiry for follow-up." });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New applicant</DialogTitle>
          <DialogDescription>Records an inquiry to be converted into an application.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Applying for</Label>
            <Select value={gradeLevel} onValueChange={(v) => setGradeLevel(String(v))}>
              <SelectTrigger id="grade" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                  <SelectItem key={grade} value={String(grade)}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent name</Label>
              <Input id="parentName" value={parentName} onChange={(e) => setParentName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent phone</Label>
              <Input id="parentPhone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Adding..." : "Add applicant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};