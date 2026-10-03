"use client";

import { useMemo, useState } from "react";
import { Megaphone, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Announcement } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { TODAY, dateLabel } from "@/lib/mock/constants";
import { cn } from "@/lib/utils";

const AUDIENCES: { value: Announcement["audience"]; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "students", label: "Students" },
  { value: "families", label: "Parents & Families" },
  { value: "teachers", label: "Teachers" },
  { value: "staff", label: "Staff" },
];

export default function AnnouncementsPage() {
  const { can, role } = useSession();
  const lookups = useLookups();
  const table = useDataTable<Announcement>("announcements", { initialSort: "publishedAt", initialSortDir: "desc" });
  const [composing, setComposing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const canManage = can("announcements.manage");
  const all = useMemo(() => db.all<Announcement>("announcements"), []);

  // Students and families only see notices addressed to them.
  const rows = useMemo(() => {
    if (role === "student" || role === "family") {
      const audience = role === "student" ? "students" : "families";
      return table.data.filter((a) => a.audience === audience || a.audience === "all");
    }
    return table.data;
  }, [table.data, role]);

  const pinned = rows.filter((a) => a.pinned);
  const urgent = rows.filter((a) => a.priority === "urgent");

  const togglePin = async (row: Announcement) => {
    await db.update<Announcement>("announcements", row.id, { pinned: !row.pinned });
    table.refresh();
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description={`${rows.length} notices on the notice board`}
        actions={
          canManage ? (
            <Button onClick={() => setComposing(true)}>
              <Plus className="size-4" />
              New announcement
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Notices" value={all.length} icon={Megaphone} tone="info" />
        <StatCard label="Pinned" value={pinned.length} icon={Pin} />
        <StatCard label="Urgent" value={urgent.length} tone={urgent.length ? "danger" : "default"} />
        <StatCard label="This Week" value={all.filter((a) => a.publishedAt >= addDays(TODAY, -7)).length} />
      </div>

      {pinned.length > 0 && (
        <section className="mb-6">
          <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">Pinned</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pinned.map((row) => (
              <Card key={row.id} className="border-primary/40">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-medium">
                      <Pin className="size-3.5 text-primary" />
                      {row.title}
                    </h3>
                    <StatusBadge value={row.priority} map={STATUS_MAPS.priority} />
                  </div>
                  <p className="text-muted-foreground text-sm">{row.body}</p>
                  <p className="text-muted-foreground text-xs">
                    {lookups.staffName(row.authorId)} · {dateLabel(row.publishedAt.slice(0, 10))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">All notices</h2>

        {rows.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements for you" description="Notices addressed to your group will appear here." />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id}>
                <Card>
                  <CardContent>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{row.title}</h3>
                          <StatusBadge value={row.priority} map={STATUS_MAPS.priority} />
                          {row.pinned && <Badge variant="outline">Pinned</Badge>}
                        </div>

                        <p
                          className={cn(
                            "text-muted-foreground mt-1.5 text-sm",
                            expanded !== row.id && "line-clamp-2",
                          )}
                        >
                          {row.body}
                        </p>

                        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
                          <span>{lookups.staffName(row.authorId)}</span>
                          <span>·</span>
                          <span>{dateLabel(row.publishedAt.slice(0, 10))}</span>
                          <span>·</span>
                          <Badge variant="secondary" className="capitalize">
                            {AUDIENCES.find((a) => a.value === row.audience)?.label ?? row.audience}
                          </Badge>
                          {expanded !== row.id && row.body.length > 140 && (
                            <button type="button" className="hover:text-primary" onClick={() => setExpanded(row.id)}>
                              Read more
                            </button>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={row.pinned ? `Unpin ${row.title}` : `Pin ${row.title}`} onClick={() => togglePin(row)}>
                            <Pin className={cn("size-4", row.pinned && "fill-primary text-primary")} />
                          </Button>
                          <ConfirmDelete
                            entity="announcements"
                            id={row.id}
                            label={row.title}
                            onDeleted={table.refresh}
                            trigger={<span className="text-destructive text-xs">Delete</span>}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ComposeDialog open={composing} onClose={() => setComposing(false)} onSaved={() => { setComposing(false); table.refresh(); }} />
    </>
  );
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const ComposeDialog = ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Announcement["audience"]>("all");
  const [priority, setPriority] = useState<Announcement["priority"]>("normal");
  const [pinned, setPinned] = useState(false);
  const [expires, setExpires] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and a message");
      return;
    }

    setPending(true);
    await db.create<Announcement>("announcements", {
      title: title.trim(),
      body: body.trim(),
      audience,
      priority,
      authorId: "stf-001",
      publishedAt: `${TODAY}T09:00:00.000Z`,
      expiresAt: expires || undefined,
      pinned,
      readBy: [],
    } as never);

    setPending(false);
    setTitle("");
    setBody("");
    setPinned(false);
    toast.success("Announcement published", { description: "It is now visible to the selected audience." });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>Publish a notice to a selected audience.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Announcement["audience"])}>
                <SelectTrigger id="audience" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Announcement["priority"])}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["low", "normal", "high", "urgent"].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires on</Label>
              <Input id="expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={pinned} onCheckedChange={(checked) => setPinned(checked === true)} />
            Pin to the top of the notice board
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};