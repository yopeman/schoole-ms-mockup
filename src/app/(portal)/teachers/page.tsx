"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, MoreHorizontal, Star } from "lucide-react";
import type { Teacher } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { money, dateLabel } from "@/lib/mock/constants";
import { TeacherFormDialog } from "./teacher-form";

export default function TeachersPage() {
  const { can } = useSession();
  const lookups = useLookups();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [creating, setCreating] = useState(false);

  const table = useDataTable<Teacher>("teachers", { initialSort: "firstName" });

  const workload = useMemo(() => {
    const map = new Map<string, number>();
    for (const teacher of lookups.teachers) map.set(teacher.id, teacher.classIds.length);
    return map;
  }, [lookups.teachers]);

  const columns: Column<Teacher>[] = [
    {
      key: "name",
      header: "Teacher",
      sortable: true,
      sortValue: (row) => `${row.firstName} ${row.lastName}`,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{row.firstName[0]}{row.lastName[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link href={`/teachers/${row.id}`} className="hover:text-primary block truncate font-medium">
              {row.firstName} {row.lastName}
            </Link>
            <p className="text-muted-foreground text-xs">{row.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Designation", sortable: true },
    { key: "department", header: "Department", secondary: true, sortable: true },
    {
      key: "subjects",
      header: "Subjects",
      secondary: true,
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.subjects.slice(0, 2).map((id) => (
            <Badge key={id} variant="secondary">
              {lookups.subjectName(id)}
            </Badge>
          ))}
          {row.subjects.length > 2 && <Badge variant="outline">+{row.subjects.length - 2}</Badge>}
        </div>
      ),
    },
    {
      key: "workload",
      header: "Classes",
      align: "center",
      sortable: true,
      sortValue: (row) => workload.get(row.id) ?? 0,
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <BookOpen className="text-muted-foreground size-3.5" />
          {workload.get(row.id) ?? 0}
        </span>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      align: "center",
      sortable: true,
      cell: (row) =>
        row.rating ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            {row.rating}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "employmentType", header: "Type", secondary: true, cell: (row) => <StatusBadge value={row.employmentType} map={STATUS_MAPS.employment} /> },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge value={row.status} map={STATUS_MAPS.student} /> },
  ];

  return (
    <>
      <PageHeader
        title="Teachers"
        description={`${table.total} teaching staff on record`}
        actions={
          can("teachers.manage") ? (
            <Button onClick={() => setCreating(true)}>Add teacher</Button>
          ) : undefined
        }
      />

      <DataTable
        rows={table.data}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search teachers..." }}
        filters={[
          { key: "department", label: "department", options: [...new Set(lookups.teachers.map((t) => t.department))].sort().map((d) => ({ value: d, label: d })) },
          { key: "designation", label: "designation", options: [...new Set(lookups.teachers.map((t) => t.designation))].sort().map((d) => ({ value: d, label: d })) },
          { key: "employmentType", label: "type", options: [{ value: "full_time", label: "Full time" }, { value: "part_time", label: "Part time" }, { value: "contract", label: "Contract" }, { value: "visiting", label: "Visiting" }] },
          { key: "status", label: "status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
        ]}
        filterValues={table.state.filters}
        onFilterChange={table.setFilter}
        sort={{ key: table.state.sortKey, dir: table.state.sortDir, onChange: table.setSort }}
        pagination={{
          page: table.state.page,
          pageCount: table.pageCount,
          total: table.total,
          pageSize: table.state.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        exportName={`teachers-${new Date().toISOString().slice(0, 10)}`}
        empty={{ title: "No teachers found" }}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.firstName} ${row.lastName}`} />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/teachers/${row.id}`} />}>View profile</DropdownMenuItem>
              {can("teachers.manage") && (
                <>
                  <DropdownMenuItem onClick={() => setEditing(row)}>Edit details</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ConfirmDelete
                    entity="teachers"
                    id={row.id}
                    label={`${row.firstName} ${row.lastName}`}
                    onDeleted={table.refresh}
                    trigger={
                      <span className="text-destructive">Delete teacher</span>
                    }
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <TeacherFormDialog
        open={creating || !!editing}
        teacher={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          table.refresh();
        }}
      />

      <p className="text-muted-foreground mt-6 text-xs">
        Average salary {money(lookups.teachers.reduce((s, t) => s + t.salary, 0) / Math.max(1, lookups.teachers.length))} · joined
        between {dateLabel("2015-01-01")} and today
      </p>
    </>
  );
}