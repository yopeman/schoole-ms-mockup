"use client";

import Link from "next/link";
import { MoreHorizontal, UserCog } from "lucide-react";
import type { Staff } from "@/types";
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
import { dateLabel, money } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";

export default function StaffPage() {
  const { can } = useSession();
  const lookups = useLookups();
  const table = useDataTable<Staff>("staff", { initialSort: "firstName" });
  const payrollRecords = db.all<import("@/types").PayrollRecord>("payroll");

  const payroll = (staffId: string) => payrollRecords.find((p) => p.staffId === staffId && p.status === "paid");

  const columns: Column<Staff>[] = [
    {
      key: "name",
      header: "Staff Member",
      sortable: true,
      sortValue: (row) => `${row.firstName} ${row.lastName}`,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{row.firstName[0]}{row.lastName[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{row.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Designation", sortable: true },
    { key: "department", header: "Department", sortable: true },
    {
      key: "joinDate",
      header: "Joined",
      secondary: true,
      sortable: true,
      cell: (row) => dateLabel(row.joinDate),
    },
    {
      key: "salary",
      header: "Salary",
      align: "right",
      secondary: true,
      sortable: true,
      cell: (row) => money(row.salary),
    },
    {
      key: "lastPayroll",
      header: "Last Payday",
      align: "right",
      secondary: true,
      cell: (row) => {
        const record = payroll(row.id);
        return record ? (
          <span className="text-muted-foreground text-xs">{money(record.netSalary)}</span>
        ) : (
          <Badge variant="outline">Pending</Badge>
        );
      },
    },
    { key: "employmentType", header: "Type", cell: (row) => <StatusBadge value={row.employmentType} map={STATUS_MAPS.employment} /> },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge value={row.status} map={STATUS_MAPS.student} /> },
  ];

  const totalPayroll = lookups.staff.reduce((sum, s) => sum + s.salary, 0);

  return (
    <>
      <PageHeader title="Staff" description={`${table.total} non-teaching staff members`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Summary label="Monthly payroll" value={money(totalPayroll)} />
        <Summary label="Departments" value={new Set(lookups.staff.map((s) => s.department)).size} />
        <Summary label="Average tenure" value={`${Math.round(lookups.staff.reduce((sum, s) => sum + (2026 - Number(s.joinDate.slice(0, 4))), 0) / Math.max(1, lookups.staff.length))} yrs`} />
      </div>

      <DataTable
        rows={table.data}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search staff..." }}
        filters={[
          { key: "department", label: "department", options: [...new Set(lookups.staff.map((s) => s.department))].sort().map((d) => ({ value: d, label: d })) },
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
        exportName={`staff-${new Date().toISOString().slice(0, 10)}`}
        empty={{ title: "No staff records found" }}
        rowActions={
          can("staff.manage")
            ? (row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.firstName} ${row.lastName}`} />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/staff/${row.id}`} />}>View profile</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <ConfirmDelete
                      entity="staff"
                      id={row.id}
                      label={`${row.firstName} ${row.lastName}`}
                      onDeleted={table.refresh}
                      trigger={<span className="text-destructive">Delete staff record</span>}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : undefined
        }
      />
    </>
  );
}

const Summary = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
      <UserCog className="size-5" />
    </div>
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  </div>
);