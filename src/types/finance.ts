import type { EntityMeta } from "./common";

export type FeeFrequency = "monthly" | "quarterly" | "annual" | "one_time";

export type FeeComponent = EntityMeta & {
  id: string;
  name: string;
  gradeLevels: number[];
  frequency: FeeFrequency;
  amount: number;
  mandatory: boolean;
};

export type FeeStructure = EntityMeta & {
  id: string;
  name: string;
  academicYearId: string;
  termId?: string;
  totalAmount: number;
  discountPercent: number;
};

export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "overdue" | "cancelled";

export type Invoice = EntityMeta & {
  id: string;
  number: string;
  studentId: string;
  academicYearId: string;
  termId?: string;
  issuedDate: string;
  dueDate: string;
  items: { name: string; amount: number }[];
  subtotal: number;
  discountPercent: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
};

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card"
  | "cheque"
  | "online"
  | "cheque"
  | "easypaisa";

export type Payment = EntityMeta & {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  collectedById: string;
  remarks?: string;
};

export type ExpenseCategory =
  | "salaries"
  | "utilities"
  | "maintenance"
  | "supplies"
  | "transport"
  | "events"
  | "marketing"
  | "other";

export type Expense = EntityMeta & {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  incurredDate: string;
  paidTo: string;
  approvedById: string;
  status: "pending" | "approved" | "paid" | "rejected";
};

export type PayrollRecord = EntityMeta & {
  id: string;
  staffId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "paid";
};

export type Scholarship = EntityMeta & {
  id: string;
  name: string;
  amountPercent: number;
  criteria: string;
  studentIds: string[];
  academicYearId: string;
};