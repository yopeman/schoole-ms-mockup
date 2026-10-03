"use client";

import { useState } from "react";
import { BarChart3, Check, Plus, Receipt, X } from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { ExpenseBreakdown } from "@/components/finance/finance-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDataTable } from "@/hooks/use-data-table";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { TODAY, dateLabel, money } from "@/lib/mock/constants";

const CATEGORIES: Expense["category"][] = [
  "salaries",
  "utilities",
  "maintenance",
  "supplies",
  "transport",
  "events",
  "marketing",
  "other",
];

export default function ExpensesPage() {
  const { can } = useSession();
  const table = useDataTable<Expense>("expenses", { initialSort: "incurredDate", initialSortDir: "desc" });
  const [creating, setCreating] = useState(false);

  const canManage = can("finance.manage");

  const rows = table.data;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const pending = rows.filter((row) => row.status === "pending");
  const approved = rows.filter((row) => row.status === "approved" || row.status === "paid");

  const decide = async (row: Expense, status: "approved" | "rejected") => {
    await db.update<Expense>("expenses", row.id, { status });
    toast.success(`${row.description} ${status}`);
    table.refresh();
  };

  const columns: Column<Expense>[] = [
    { key: "description", header: "Description", sortable: true },
    {
      key: "category",
      header: "Category",
      sortable: true,
      cell: (row) => <StatusBadge value={row.category} map={CATEGORY_MAP} />,
    },
    { key: "paidTo", header: "Paid To", secondary: true },
    { key: "incurredDate", header: "Date", sortable: true, secondary: true, cell: (row) => dateLabel(row.incurredDate) },
    { key: "amount", header: "Amount", align: "right", sortable: true, cell: (row) => <span className="font-medium">{money(row.amount)}</span> },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge value={row.status} map={STATUS_MAPS.employment} /> },
  ];

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Operational spending and approval workflow"
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Record expense
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Spend" value={money(total)} icon={Receipt} />
        <StatCard label="Approved / Paid" value={money(approved.reduce((s, r) => s + r.amount, 0))} tone="positive" />
        <StatCard label="Awaiting Approval" value={money(pending.reduce((s, r) => s + r.amount, 0))} tone={pending.length ? "warning" : "default"} hint={`${pending.length} claim(s)`} />
        <StatCard label="Categories" value={new Set(rows.map((r) => r.category)).size} icon={BarChart3} />
      </div>

      <ExpenseBreakdown expenses={table.state.filters.status ? rows.filter((r) => r.status === table.state.filters.status) : rows} />

      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          loading={table.loading}
          error={table.error}
          search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search expenses..." }}
          filters={[
            { key: "category", label: "category", options: CATEGORIES.map((c) => ({ value: c, label: c.replace(/^./, (x) => x.toUpperCase()) })) },
            { key: "status", label: "status", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "paid", label: "Paid" }, { value: "rejected", label: "Rejected" }] },
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
          exportName={`expenses-${TODAY}`}
          empty={{ title: "No expenses recorded" }}
          rowActions={(row) =>
            canManage && row.status === "pending" ? (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Approve ${row.description}`} onClick={() => decide(row, "approved")}>
                  <Check className="size-4 text-emerald-600" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Reject ${row.description}`} onClick={() => decide(row, "rejected")}>
                  <X className="size-4 text-destructive" />
                </Button>
              </div>
            ) : null
          }
        />
      </div>

      <ExpenseDialog open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); table.refresh(); }} />
    </>
  );
}

const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c, { label: c.replace(/^./, (x) => x.toUpperCase()), tone: "info" as const }]),
);

const ExpenseDialog = ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) => {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Expense["category"]>("maintenance");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [priorityDate, setPriorityDate] = useState(TODAY);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const value = Number(amount);
    if (!description.trim() || !value || value <= 0) {
      toast.error("Enter a description and a valid amount");
      return;
    }

    setPending(true);
    await db.create<Expense>("expenses", {
      description: description.trim(),
      category,
      amount: value,
      incurredDate: priorityDate,
      paidTo: paidTo.trim() || "Various Vendors",
      approvedById: "stf-001",
      status: "pending",
    } as never);

    setPending(false);
    setDescription("");
    setAmount("");
    setPaidTo("");
    toast.success("Expense recorded", { description: "Awaiting approval." });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record expense</DialogTitle>
          <DialogDescription>New claims enter the approval queue.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Expense["category"])}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace(/^./, (x) => x.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidTo">Paid to</Label>
              <Input id="paidTo" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Vendor name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Incurred on</Label>
              <Input id="date" type="date" value={priorityDate} onChange={(e) => setPriorityDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Recording..." : "Record expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};