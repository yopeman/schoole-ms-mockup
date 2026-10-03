"use client";

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgePercent, Mail, MapPin, Phone, Receipt } from "lucide-react";
import type { Family, Student } from "@/types";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RateBadge, StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAttendanceSummary, useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { lastNWeekdays } from "@/lib/mock/analytics";
import { TODAY, money } from "@/lib/mock/constants";

export default function FamilyDetailPage() {
  const params = useParams<{ id: string }>();
  const { role, profileId } = useSession();
  const lookups = useLookups();

  const family = lookups.familyMap.get(params.id) as Family | undefined;
  const allowed = role !== "family" || profileId === family?.id;

  const children = (family?.studentIds ?? [])
    .map((id) => lookups.studentMap.get(id))
    .filter((s): s is Student => !!s);

  const window30 = lastNWeekdays(TODAY, 30);
  const summary = useAttendanceSummary(children.map((c) => c.id), window30[0], window30[29]);

  if (!family || !allowed) {
    return (
      <EmptyState
        icon={Receipt}
        title="Family record unavailable"
        description="This record does not exist or is outside your scope."
        action={<Button render={<Link href="/families" />}>Back to families</Button>}
      />
    );
  }

  const invoices = lookups.invoices.filter((i) => children.some((c) => c.id === i.studentId));
  const billed = invoices.reduce((sum, i) => sum + i.total, 0);
  const paid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const primary = family.guardians.find((g) => g.isPrimary) ?? family.guardians[0];

  return (
    <>
      <PageHeader
        title={family.name}
        description={`${children.length} ${children.length === 1 ? "child" : "children"} enrolled · Income band: ${family.monthlyIncomeBand.replace("_", " ")}`}
        badge={family.scholarship ? <Badge>Scholarship</Badge> : undefined}
        actions={
          <Button variant="outline" render={<Link href="/families" />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Children" value={children.length} tone="info" />
        <StatCard
          label="Average Attendance"
          value={`${children.length ? Math.round(children.reduce((s, c) => s + (summary.get(c.id)?.percentage ?? 0), 0) / children.length) : 0}%`}
          tone="positive"
        />
        <StatCard label="Fees Paid" value={money(paid)} hint={`of ${money(billed)}`} />
        <StatCard label="Concession" value={`${family.discountPercent}%`} icon={BadgePercent} tone={family.discountPercent > 0 ? "positive" : "default"} />
      </div>

      <Tabs defaultValue="children" className="mt-6">
        <TabsList>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="mt-4 grid gap-4 lg:grid-cols-2">
          {children.map((child) => {
            const attendance = summary.get(child.id);
            return (
              <SectionCard key={child.id} title={`${child.firstName} ${child.lastName}`}>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{child.firstName[0]}{child.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/students/${child.id}`} className="hover:text-primary block truncate font-medium">
                      {child.firstName} {child.lastName}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {lookups.className(child.classId)} · {lookups.sectionName(child.sectionId)} · {child.studentCode}
                    </p>
                  </div>
                  <RateBadge rate={attendance?.percentage ?? 0} />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Present days</span>
                    <span className="font-medium">{attendance?.present ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Absent days</span>
                    <span className="font-medium">{attendance?.absent ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge value={child.status} map={STATUS_MAPS.student} />
                  </div>
                  <Progress value={attendance?.percentage ?? 0} />
                </div>
              </SectionCard>
            );
          })}
          {children.length === 0 && <EmptyState title="No children enrolled" />}
        </TabsContent>

        <TabsContent value="guardians" className="mt-4 grid gap-4 lg:grid-cols-2">
          {family.guardians.map((guardian) => (
            <SectionCard
              key={guardian.id}
              title={`${guardian.firstName} ${guardian.lastName}`}
              action={guardian.isPrimary ? <Badge>Primary</Badge> : undefined}
            >
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground capitalize">{guardian.relation}</dt>
                  <dd className="font-medium capitalize">{guardian.occupation ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground flex items-center gap-2"><Phone className="size-3.5" /> Phone</dt>
                  <dd className="font-medium">{guardian.phone}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground flex items-center gap-2"><Mail className="size-3.5" /> Email</dt>
                  <dd className="font-medium">{guardian.email ?? "—"}</dd>
                </div>
              </dl>
            </SectionCard>
          ))}
          <SectionCard title="Address" className="lg:col-span-2">
            <p className="text-muted-foreground flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {family.address ? `${family.address.line1}, ${family.address.city}, ${family.address.state} ${family.address.postalCode}` : "—"}
            </p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <SectionCard title="Fee Ledger" description={`${invoices.length} invoices across the family`}>
            {invoices.length === 0 ? (
              <EmptyState title="No invoices" />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Invoice</th>
                      <th className="px-4 py-2 text-left font-medium">Student</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                      <th className="px-4 py-2 text-right font-medium">Balance</th>
                      <th className="px-4 py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-2">{invoice.number}</td>
                        <td className="px-4 py-2">{lookups.studentName(invoice.studentId)}</td>
                        <td className="px-4 py-2 text-right">{money(invoice.total)}</td>
                        <td className="px-4 py-2 text-right">{money(invoice.balance)}</td>
                        <td className="px-4 py-2 text-right">
                          <StatusBadge value={invoice.status} map={STATUS_MAPS.invoice} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground mt-6 text-xs">
        Primary contact: {primary.firstName} {primary.lastName} · {primary.phone}
      </p>
    </>
  );
}