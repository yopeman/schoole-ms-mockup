"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { PayrollRecord } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { money, monthLabel } from "@/lib/mock/constants";

const MONTHS = ["2026-07", "2026-08", "2026-09", "2026-10"];

export default function PayrollPage() {
  const lookups = useLookups();
  const { can } = useSession();
  const table = useDataTable<PayrollRecord>("payroll", { initialSort: "month", initialSortDir: "desc" });
  const [month, setMonth] = useState(MONTHS[MONTHS.length - 1]);

  const all = useMemo(() => db.all<PayrollRecord>("payroll"), []);
  const monthRecords = useMemo(() => all.filter((r) => r.month === month), [all, month]);

  const pending = monthRecords.filter((r) => r.status === "pending");
  const paidTotal = monthRecords.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.netSalary, 0);
  const pendingTotal = pending.reduce((sum, r) => sum + r.netSalary, 0);

  const columns: Column<PayrollRecord>[] = [
    {
      key: "staff",
      header: "Staff Member",
      sortable: true,
      sortValue: (row) => lookups.staffName(row.staffId),
      cell: (row) => {
        const member = lookups.staff.find((s) => s.id === row.staffId);
        return (
          <div>
            <p className="font-medium">{lookups.staffName(row.staffId)}</p>
            <p className="text-muted-foreground text-xs">{member?.designation ?? "—"}</p>
          </div>
        );
      },
    },
    { key: "month", header: "Month", sortable: true, cell: (row) => monthLabel(row.month) },
    { key: "basicSalary", header: "Basic", align: "right", sortable: true, secondary: true, cell: (row) => money(row.basicSalary) },
    { key: "allowances", header: "Allowances", align: "right", secondary: true, cell: (row) => money(row.allowances) },
    { key: "deductions", header: "Deductions", align: "right", secondary: true, cell: (row) => `- ${money(row.deductions)}` },
    { key: "netSalary", header: "Net Pay", align: "right", sortable: true, cell: (row) => <span className="font-medium">{money(row.netSalary)}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => <StatusBadge value={row.status} map={STATUS_MAPS.employment} />,
    },
  ];

  const payAll = async () => {
    for (const record of pending) {
      await db.update<PayrollRecord>("payroll", record.id, { status: "paid" });
    }
    toast.success(`${pending.length} salary payments marked as paid`, {
      description: `${money(pendingTotal)} disbursed for ${monthLabel(month)}.`,
    });
    table.refresh();
  };

  return (
    <>
      <PageHeader
        title="Payroll"
        description="Monthly salary disbursement for teaching and non-teaching staff"
        actions={
          <>
            <Select value={month} onValueChange={(v) => setMonth(String(v))}>
              <SelectTrigger className="w-40" aria-label="Payroll month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {monthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {can("finance.manage") && pending.length > 0 && (
              <Button onClick={payAll}>
                <CheckCheck className="size-4" />
                Mark all paid
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Staff On Payroll" value={monthRecords.length} icon={Users} tone="info" />
        <StatCard label="Disbursed" value={money(paidTotal)} icon={Wallet} tone="positive" />
        <StatCard label="Pending" value={money(pendingTotal)} tone={pendingTotal > 0 ? "warning" : "positive"} />
        <StatCard label="Total Payout" value={money(paidTotal + pendingTotal)} />
      </div>

      <div className="bg-card mb-6 rounded-xl border p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{monthLabel(month)} payout progress</span>
          <span className="text-muted-foreground">
            {monthRecords.length - pending.length} of {monthRecords.length} paid
          </span>
        </div>
        <Progress
          value={monthRecords.length === 0 ? 0 : ((monthRecords.length - pending.length) / monthRecords.length) * 100}
        />
        {pending.length > 0 && (
          <Badge variant="outline" className="mt-3">
            {pending.length} payment(s) awaiting disbursement
          </Badge>
        )}
      </div>

      <DataTable
        rows={table.data}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search staff..." }}
        filters={[
          { key: "status", label: "status", options: [{ value: "paid", label: "Paid" }, { value: "pending", label: "Pending" }] },
          { key: "month", label: "month", options: MONTHS.map((m) => ({ value: m, label: monthLabel(m) })) },
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
        exportName={`payroll-${month}`}
        empty={{ title: "No payroll records" }}
        rowActions={(row) =>
          can("finance.manage") && row.status === "pending" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await db.update<PayrollRecord>("payroll", row.id, { status: "paid" });
                toast.success(`${lookups.staffName(row.staffId)} paid`);
                table.refresh();
              }}
            >
              Mark paid
            </Button>
          ) : null
        }
      />

      <p className="text-muted-foreground mt-6 text-xs">
        Payroll covers the {lookups.staff.length} leadership and support staff. Teaching salaries are tracked per employee
        under Teachers.
      </p>
    </>
  );
}