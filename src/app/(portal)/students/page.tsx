"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Student } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { db } from "@/lib/mock/server";
import { StudentFormDialog } from "./student-form";

export default function StudentsPage() {
  const { can, profileId, role } = useSession();
  const lookups = useLookups();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const table = useDataTable<Student>("students", { initialSort: "rollNumber" });

  // Students, families and teachers only ever see the records they are linked to.
  const visibleIds = useMemo(() => {
    if (role === "student") return new Set([profileId ?? ""]);
    if (role === "family") {
      const family = lookups.families.find((f) => f.id === profileId);
      return new Set(family?.studentIds ?? []);
    }
    if (role === "teacher") {
      const sections = new Set(lookups.sections.filter((s) => s.teacherId === profileId).map((s) => s.id));
      const classes = new Set(lookups.teachers.find((t) => t.id === profileId)?.classIds ?? []);
      return new Set(
        lookups.students.filter((s) => sections.has(s.sectionId) || classes.has(s.classId)).map((s) => s.id),
      );
    }
    return null;
  }, [role, profileId, lookups]);

  const rows = useMemo(() => (visibleIds ? table.data.filter((row) => visibleIds.has(row.id)) : table.data), [table.data, visibleIds]);

  const columns: Column<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      sortValue: (row) => `${row.firstName} ${row.lastName}`,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{row.firstName[0]}{row.lastName[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link href={`/students/${row.id}`} className="hover:text-primary block truncate font-medium">
              {row.firstName} {row.lastName}
            </Link>
            <p className="text-muted-foreground text-xs">{row.studentCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      sortable: true,
      sortValue: (row) => lookups.className(row.classId),
      cell: (row) => (
        <div>
          <p className="font-medium">{lookups.className(row.classId)}</p>
          <p className="text-muted-foreground text-xs">
            {lookups.sectionName(row.sectionId)} · Roll {row.rollNumber}
          </p>
        </div>
      ),
    },
    { key: "gender", header: "Gender", secondary: true, sortable: true, cell: (row) => <span className="capitalize">{row.gender}</span> },
    {
      key: "guardian",
      header: "Guardian",
      secondary: true,
      cell: (row) => {
        const guardian = row.guardians.find((g) => g.isPrimary) ?? row.guardians[0];
        return (
          <div>
            <p>{guardian ? `${guardian.firstName} ${guardian.lastName}` : "—"}</p>
            <p className="text-muted-foreground text-xs">{guardian?.phone}</p>
          </div>
        );
      },
    },
    {
      key: "fee",
      header: "Fee Status",
      secondary: true,
      cell: (row) => {
        const invoice = lookups.invoices.find((i) => i.studentId === row.id);
        return invoice ? (
          <StatusBadge value={invoice.status} map={STATUS_MAPS.invoice} />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge value={row.status} map={STATUS_MAPS.student} /> },
  ];

  const bulkDelete = async (ids: string[]) => {
    for (const id of ids) await db.remove("students", id);
    toast.success(`${ids.length} student record(s) removed`);
    table.refresh();
  };

  return (
    <>
      <PageHeader
        title="Students"
        description={`${table.total} students across ${lookups.classes.length} classes`}
        actions={
          can("students.manage") ? (
            <>
              <Button variant="outline" onClick={() => table.refresh()}>
                Refresh
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Add student
              </Button>
            </>
          ) : undefined
        }
      />

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search name or code..." }}
        filters={[
          {
            key: "classId",
            label: "class",
            options: lookups.classes.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            key: "sectionId",
            label: "section",
            options: lookups.sections.map((s) => ({ value: s.id, label: `${lookups.className(s.classId)} · ${s.name}` })),
          },
          { key: "gender", label: "gender", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }] },
          { key: "status", label: "status", options: Object.entries(STATUS_MAPS.student).map(([value, meta]) => ({ value, label: meta.label })) },
          { key: "category", label: "category", options: ["general", "sc", "st", "obc", "ews"].map((value) => ({ value, label: value.toUpperCase() })) },
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
        selection={can("students.manage") ? { label: (row) => `${row.firstName} ${row.lastName}` } : undefined}
        bulkActions={
          can("students.manage")
            ? (ids, clear) => (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await bulkDelete(ids);
                      clear();
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      for (const row of rows.filter((r) => ids.includes(r.id))) {
                        void db.update("students", row.id, { status: "inactive" } as never);
                      }
                      toast.success(`${ids.length} student(s) marked inactive`);
                      clear();
                      table.refresh();
                    }}
                  >
                    Mark inactive
                  </Button>
                </>
              )
            : undefined
        }
        exportName={`students-${new Date().toISOString().slice(0, 10)}`}
        empty={{ title: "No students found", description: "Adjust your search or filters, or add a new student." }}
        rowActions={(row) => (
          <RowActions row={row} canManage={can("students.manage")} onEdit={() => setEditing(row)} onDeleted={table.refresh} />
        )}
      />

      <StudentFormDialog
        open={creating || !!editing}
        student={editing}
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
    </>
  );
}

const RowActions = ({
  row,
  canManage,
  onEdit,
  onDeleted,
}: {
  row: Student;
  canManage: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.firstName} ${row.lastName}`} />}>
      <MoreHorizontal className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem render={<Link href={`/students/${row.id}`} />}>View profile</DropdownMenuItem>
      {canManage && (
        <>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmDelete
            entity="students"
            id={row.id}
            label={`${row.firstName} ${row.lastName}`}
            onDeleted={onDeleted}
            trigger={
              <span className="text-destructive flex w-full items-center gap-2">
                <Trash2 className="size-4" />
                Delete student
              </span>
            }
          />
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);