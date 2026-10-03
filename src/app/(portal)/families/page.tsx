"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BadgePercent, GraduationCap, Users } from "lucide-react";
import type { Family } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";

export default function FamiliesPage() {
  const { role, profileId } = useSession();
  const lookups = useLookups();
  const table = useDataTable<Family>("families", { initialSort: "name" });

  const isOwnOnly = role === "family";

  const rows = useMemo(() => {
    if (!isOwnOnly) return table.data;
    return table.data.filter((family) => family.id === profileId);
  }, [table.data, isOwnOnly, profileId]);

  const columns: Column<Family>[] = [
    {
      key: "name",
      header: "Family",
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <Link href={`/families/${row.id}`} className="hover:text-primary block truncate font-medium">
            {row.name}
          </Link>
          <p className="text-muted-foreground text-xs">{row.guardians[0]?.phone}</p>
        </div>
      ),
    },
    {
      key: "children",
      header: "Children",
      sortable: true,
      sortValue: (row) => row.studentIds.length,
      cell: (row) => {
        const children = row.studentIds
          .map((id) => lookups.studentMap.get(id))
          .filter((s): s is NonNullable<typeof s> => !!s);
        return (
          <div className="min-w-0">
            <p className="text-sm">
              {children.map((c) => `${c.firstName} (${lookups.className(c.classId)})`).join(", ") || "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              {children.length} {children.length === 1 ? "child" : "children"}
            </p>
          </div>
        );
      },
    },
    {
      key: "guardian",
      header: "Primary Guardian",
      secondary: true,
      cell: (row) => {
        const guardian = row.guardians.find((g) => g.isPrimary) ?? row.guardians[0];
        return (
          <div>
            <p>
              {guardian.firstName} {guardian.lastName}
            </p>
            <p className="text-muted-foreground text-xs capitalize">{guardian.relation}</p>
          </div>
        );
      },
    },
    {
      key: "monthlyIncomeBand",
      header: "Income Band",
      secondary: true,
      sortable: true,
      cell: (row) => <span className="capitalize">{row.monthlyIncomeBand.replace("_", " ")}</span>,
    },
    {
      key: "discountPercent",
      header: "Concession",
      align: "center",
      sortable: true,
      cell: (row) =>
        row.discountPercent > 0 ? (
          <Badge variant="secondary" className="gap-1">
            <BadgePercent className="size-3" />
            {row.discountPercent}%
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "portalEnabled",
      header: "Portal",
      align: "center",
      secondary: true,
      cell: (row) =>
        row.portalEnabled ? <Badge variant="outline">Active</Badge> : <span className="text-muted-foreground text-xs">Disabled</span>,
    },
  ];

  const totalScholarships = lookups.families.filter((f) => f.scholarship).length;

  return (
    <>
      <PageHeader
        title="Families"
        description={
          isOwnOnly
            ? "Your family record"
            : `${table.total} families linked to ${lookups.students.length} students`
        }
      />

      {!isOwnOnly && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Summary icon={Users} label="Families" value={lookups.families.length} />
          <Summary icon={GraduationCap} label="Students" value={lookups.students.length} />
          <Summary icon={BadgePercent} label="Scholarship Families" value={totalScholarships} />
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search families..." }}
        filters={[
          { key: "monthlyIncomeBand", label: "income", options: ["low", "middle", "upper_middle", "high"].map((v) => ({ value: v, label: v.replace("_", " ").replace(/^./, (c) => c.toUpperCase()) })) },
          { key: "portalEnabled", label: "portal", options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }] },
        ]}
        filterValues={table.state.filters}
        onFilterChange={table.setFilter}
        sort={{ key: table.state.sortKey, dir: table.state.sortDir, onChange: table.setSort }}
        pagination={{
          page: table.state.page,
          pageCount: table.pageCount,
          total: rows.length,
          pageSize: table.state.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        exportName={`families-${new Date().toISOString().slice(0, 10)}`}
        empty={{ title: "No families found", description: "Adjust your search or filters." }}
        rowActions={(row) => (
          <Button variant="ghost" size="sm" render={<Link href={`/families/${row.id}`} />}>
            View
          </Button>
        )}
      />

      {rows.length === 0 && !table.loading && (
        <div className="mt-6">
          <EmptyState title="No family records" description="Families appear once students are enrolled." />
        </div>
      )}
    </>
  );
}

const Summary = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) => (
  <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
      <Icon className="size-5" />
    </div>
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  </div>
);