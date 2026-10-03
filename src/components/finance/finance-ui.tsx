"use client";

import { useMemo } from "react";
import { Banknote, TrendingUp, Users, Wallet } from "lucide-react";
import type { Invoice, Payment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { money } from "@/lib/mock/constants";

type Props = {
  billed: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
  overdueAmount: number;
  collectionRate: number;
  statusCounts: { paid: number; partial: number; issued: number; overdue: number };
};

export function FinanceSummary({ billed, collected, outstanding, collectionRate, statusCounts }: Props) {
  const tiles = [
    { label: "Total Billed", value: billed, icon: Banknote, tone: "" },
    { label: "Collected", value: collected, icon: TrendingUp, tone: "text-emerald-600" },
    { label: "Outstanding", value: outstanding, icon: Wallet, tone: "text-amber-600" },
    { label: "Invoices", value: statusCounts.paid + statusCounts.partial + statusCounts.issued + statusCounts.overdue, icon: Users, tone: "" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className="gap-0 py-5">
          <CardContent className="flex items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-sm">{tile.label}</p>
              <p className={cn("text-2xl font-semibold tracking-tight", tile.tone)}>{money(tile.value)}</p>
            </div>
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <tile.icon className="size-5" />
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="sm:col-span-2 xl:col-span-4">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium">Collection progress</span>
              <span className="text-muted-foreground ml-2">{collectionRate}% of billed fees received</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{statusCounts.paid} paid</Badge>
              <Badge variant="outline">{statusCounts.partial} partial</Badge>
              <Badge variant="outline">{statusCounts.issued} unpaid</Badge>
              <Badge variant="destructive">{statusCounts.overdue} overdue</Badge>
            </div>
          </div>
          <Progress value={collectionRate} />
        </CardContent>
      </Card>
    </div>
  );
}

export const PaymentDialogSummary = ({
  invoice,
  payments,
}: {
  invoice: Invoice;
  payments: Payment[];
}) => {
  const lines = useMemo(
    () => [
      ...invoice.items.map((item) => ({ label: item.name, value: item.amount })),
      ...(invoice.discountPercent > 0 ? [{ label: `Discount (${invoice.discountPercent}%)`, value: invoice.total - invoice.subtotal }] : []),
    ],
    [invoice],
  );

  return (
    <div className="space-y-4">
      <ul className="divide-border divide-y rounded-lg border">
        {lines.map((line) => (
          <li key={line.label} className="flex justify-between px-4 py-2 text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span className={line.value < 0 ? "text-emerald-600" : "font-medium"}>{money(line.value)}</span>
          </li>
        ))}
        <li className="flex justify-between px-4 py-2 text-sm font-semibold">
          <span>Total</span>
          <span>{money(invoice.total)}</span>
        </li>
        <li className="text-muted-foreground flex justify-between px-4 py-2 text-sm">
          <span>Paid</span>
          <span>{money(invoice.paidAmount)}</span>
        </li>
        <li className="flex justify-between px-4 py-2 text-sm font-semibold">
          <span>Balance due</span>
          <span className={invoice.balance > 0 ? "text-destructive" : "text-emerald-600"}>{money(invoice.balance)}</span>
        </li>
      </ul>

      {payments.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Payment history</p>
          <ul className="space-y-1.5">
            {payments.map((payment) => (
              <li key={payment.id} className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <span>
                  {payment.receiptNumber} · <span className="capitalize">{payment.method.replace("_", " ")}</span>
                </span>
                <span className="font-medium">{money(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <StatusBadge value={invoice.status} map={STATUS_MAPS.invoice} />
    </div>
  );
};
const CATEGORY_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

/** Donut of spend per expense category with a legend. */
export function ExpenseBreakdown({ expenses }: { expenses: { category: string; amount: number }[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of expenses) map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    return [...map.entries()]
      .map(([category, amount]) => ({ category: category.replace(/^./, (c) => c.toUpperCase()), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const total = data.reduce((sum, row) => sum + row.amount, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">No expenses to break down</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="amount" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.map((entry, index) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                  formatter={(value) => [money(Number(value)), "Spend"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full flex-1 space-y-2.5">
            {data.map((row, index) => (
              <li key={row.category} className="flex items-center gap-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{row.category}</span>
                <span className="text-muted-foreground text-xs">
                  {total === 0 ? 0 : Math.round((row.amount / total) * 100)}%
                </span>
                <span className="w-24 text-right text-sm font-medium">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
