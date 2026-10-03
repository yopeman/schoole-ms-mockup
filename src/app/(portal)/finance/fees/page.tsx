"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { FeeComponent, Invoice, Payment } from "@/types";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { CollectionTrend } from "@/components/dashboard/charts";
import { FinanceSummary, PaymentDialogSummary } from "@/components/finance/finance-ui";
import { Badge } from "@/components/ui/badge";
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
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { collectionByMonth, financeStats } from "@/lib/mock/analytics";
import { TODAY, dateLabel, money } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";

export default function FeesPage() {
  const lookups = useLookups();
  const { can, role, profileId } = useSession();
  const table = useDataTable<Invoice>("invoices", { initialSort: "dueDate" });
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  const canManage = can("finance.manage");

  // Families only ever see their own invoices.
  const visibleIds = useMemo(() => {
    if (role !== "family") return null;
    const family = lookups.families.find((f) => f.id === profileId);
    return new Set(
      lookups.students.filter((s) => family?.studentIds.includes(s.id)).map((s) => s.id),
    );
  }, [role, profileId, lookups]);

  const allInvoices = useMemo(() => db.all<Invoice>("invoices"), []);
  const allPayments = useMemo(() => db.all<Payment>("payments"), []);

  const scopedInvoices = useMemo(
    () => (visibleIds ? allInvoices.filter((i) => visibleIds.has(i.studentId)) : allInvoices),
    [allInvoices, visibleIds],
  );

  const stats = useMemo(() => financeStats(scopedInvoices), [scopedInvoices]);
  const trend = useMemo(
    () => collectionByMonth(allPayments.filter((p) => !visibleIds || visibleIds.has(p.studentId)), 6, TODAY),
    [allPayments, visibleIds],
  );

  const feeComponents = useMemo(() => db.all<FeeComponent>("feeComponents"), []);

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.number}</p>
          <p className="text-muted-foreground text-xs">Due {dateLabel(row.dueDate)}</p>
        </div>
      ),
    },
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (row) => lookups.studentName(row.studentId),
      cell: (row) => {
        const student = lookups.studentMap.get(row.studentId);
        return (
          <div>
            <Link href={`/students/${row.studentId}`} className="hover:text-primary block truncate font-medium">
              {lookups.studentName(row.studentId)}
            </Link>
            <p className="text-muted-foreground text-xs">{lookups.className(student?.classId)}</p>
          </div>
        );
      },
    },
    { key: "total", header: "Amount", align: "right", sortable: true, cell: (row) => money(row.total) },
    { key: "paidAmount", header: "Paid", align: "right", secondary: true, sortable: true, cell: (row) => money(row.paidAmount) },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortable: true,
      cell: (row) => <span className={row.balance > 0 ? "font-medium text-amber-600" : "text-muted-foreground"}>{money(row.balance)}</span>,
    },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge value={row.status} map={STATUS_MAPS.invoice} /> },
  ];

  return (
    <>
      <PageHeader
        title="Fees & Invoices"
        description={
          role === "family"
            ? "Invoices raised for your children"
            : `${allInvoices.length} invoices raised for the academic year`
        }
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={() => void raiseInvoice(lookups.students)}>
                <Receipt className="size-4" />
                Raise invoice
              </Button>
              <Button onClick={() => setPaying(table.data.find((i) => i.balance > 0) ?? null)} disabled={table.data.every((i) => i.balance <= 0)}>
                <Wallet className="size-4" />
                Record payment
              </Button>
            </>
          ) : undefined
        }
      />

      <FinanceSummary
        billed={stats.billed}
        collected={stats.collected}
        outstanding={stats.outstanding}
        overdueCount={stats.overdueCount}
        overdueAmount={stats.overdueAmount}
        collectionRate={stats.collectionRate}
        statusCounts={stats.statusCounts}
      />

      <div className="mt-6">
        <DataTable
          rows={table.data.filter((row) => !visibleIds || visibleIds.has(row.studentId))}
          columns={columns}
          rowKey={(row) => row.id}
          loading={table.loading}
          error={table.error}
          search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search invoice or student..." }}
          filters={[
            { key: "status", label: "status", options: Object.entries(STATUS_MAPS.invoice).map(([value, meta]) => ({ value, label: meta.label })) },
            {
              key: "studentId",
              label: "student",
              options: [...new Set(scopedInvoices.map((i) => i.studentId))]
                .slice(0, 60)
                .map((id) => ({ value: id, label: lookups.studentName(id) })),
            },
          ]}
          filterValues={table.state.filters}
          onFilterChange={table.setFilter}
          sort={{ key: table.state.sortKey, dir: table.state.sortDir, onChange: table.setSort }}
          pagination={{
            page: table.state.page,
            pageCount: table.pageCount,
            total: scopedInvoices.length,
            pageSize: table.state.pageSize,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }}
          exportName={`invoices-${TODAY}`}
          empty={{ title: "No invoices found", description: "Adjust your search or filters." }}
          rowActions={(row) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={`View ${row.number}`} onClick={() => setViewing(row)}>
                <Eye className="size-4" />
              </Button>
              {canManage && row.balance > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setPaying(row)}>
                  Pay
                </Button>
              )}
            </div>
          )}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <CollectionTrend data={trend} />
        <SectionCard title="Fee Structure" description="Components charged per academic year">
          <ul className="divide-border divide-y">
            {feeComponents.map((component) => (
              <li key={component.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{component.name}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {component.frequency.replace("_", " ")} ·{" "}
                    {component.gradeLevels.length === 12 ? "all grades" : `grades ${component.gradeLevels.slice(0, 4).join(", ")}`}
                  </p>
                </div>
                {component.mandatory ? <Badge variant="secondary">Mandatory</Badge> : <Badge variant="outline">Optional</Badge>}
                <span className="w-20 text-right text-sm font-semibold">{money(component.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <InvoiceDialog invoice={viewing} onClose={() => setViewing(null)} />
      <PaymentDialog
        invoice={paying}
        onClose={() => setPaying(null)}
        onSaved={() => {
          setPaying(null);
          table.refresh();
        }}
      />
    </>
  );
}

/** Creates a fresh Term II invoice for every active student without one. */
const raiseInvoice = async (students: { id: string; discountPercent?: number }[]) => {
  const existing = new Set(db.all<Invoice>("invoices").map((i) => i.studentId));
  const targets = students.filter((s) => !existing.has(s.id)).slice(0, 40);
  let count = 0;

  for (const [index, student] of targets.entries()) {
    const subtotal = 45000 + 12000;
    const discountPercent = student.discountPercent ?? 0;
    const total = Math.round(subtotal * (1 - discountPercent / 100));

    await db.create<Invoice>("invoices", {
      number: `SIS/26-27/T2/${String(index + 1).padStart(4, "0")}`,
      studentId: student.id,
      academicYearId: "ay-2026-27",
      termId: "term-2",
      issuedDate: TODAY,
      dueDate: "2026-11-15",
      items: [
        { name: "Tuition Fee (Term II)", amount: 45000 },
        { name: "Term Fee", amount: 12000 },
      ],
      subtotal,
      discountPercent,
      total,
      paidAmount: 0,
      balance: total,
      status: "issued",
    } as never);
    count += 1;
  }

  toast.success(
    count > 0 ? `${count} invoices raised` : "Every student already has an invoice",
    { description: "Term II billing uses the standard fee structure." },
  );
  window.location.reload();
};

const InvoiceDialog = ({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) => {
  const payments = invoice ? db.all<Payment>("payments").filter((p) => p.invoiceId === invoice.id) : [];
  if (!invoice) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{invoice.number}</DialogTitle>
          <DialogDescription>
            Issued {dateLabel(invoice.issuedDate)} · due {dateLabel(invoice.dueDate)}
          </DialogDescription>
        </DialogHeader>
        <PaymentDialogSummary invoice={invoice} payments={payments} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PaymentDialog = ({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [remarks, setRemarks] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (invoice) {
      setAmount(String(invoice.balance));
      setMethod("cash");
      setRemarks("");
    }
  }, [invoice]);

  const submit = async () => {
    if (!invoice) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (value > invoice.balance) {
      toast.error("Amount exceeds the outstanding balance");
      return;
    }

    setPending(true);
    const capped = Math.min(value, invoice.balance);

    await db.create<Payment>("payments", {
      receiptNumber: `RCPT/${Date.now().toString().slice(-6)}`,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      amount: capped,
      paidAt: TODAY,
      method: method as Payment["method"],
      collectedById: "stf-001",
      remarks: remarks || undefined,
    } as never);

    const paidAmount = invoice.paidAmount + capped;
    const balance = invoice.total - paidAmount;

    await db.update<Invoice>("invoices", invoice.id, {
      paidAmount,
      balance,
      status: balance <= 0 ? "paid" : "partial",
    });

    setPending(false);
    toast.success("Payment recorded", { description: `${money(capped)} against ${invoice.number}` });
    onSaved();
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice?.number ?? ""}
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Outstanding balance</p>
              <p className="text-xl font-semibold">{money(invoice.balance)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount received</Label>
              <Input id="amount" type="number" min={0} max={invoice.balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(String(v))}>
                <SelectTrigger id="method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["cash", "bank_transfer", "card", "cheque", "online", "easypaisa"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Recording..." : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
