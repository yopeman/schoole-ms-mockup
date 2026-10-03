import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  PieChart,
  Receipt,
  School,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
  /** Extra permission check — item visible if any of these match. */
  anyOf?: Permission[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" }],
  },
  {
    label: "People",
    items: [
      { title: "Students", href: "/students", icon: GraduationCap, permission: "students.view", anyOf: ["students.viewOwn"] },
      { title: "Teachers", href: "/teachers", icon: BookOpen, permission: "teachers.view" },
      { title: "Families", href: "/families", icon: Users, permission: "families.view", anyOf: ["families.viewOwn"] },
      { title: "Staff", href: "/staff", icon: UserCog, permission: "staff.view" },
      { title: "Admissions", href: "/admissions", icon: ClipboardCheck, permission: "admissions.view" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Classes", href: "/academics/classes", icon: School, permission: "academics.view" },
      { title: "Subjects", href: "/academics/subjects", icon: BookOpen, permission: "academics.view" },
      { title: "Timetable", href: "/timetable", icon: CalendarDays, permission: "timetable.view" },
      { title: "Attendance", href: "/attendance", icon: ClipboardCheck, permission: "attendance.view", anyOf: ["attendance.viewOwn"] },
      { title: "Exams & Results", href: "/exams", icon: FileSpreadsheet, permission: "exams.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Fees & Invoices", href: "/finance/fees", icon: Receipt, permission: "finance.view" },
      { title: "Payroll", href: "/finance/payroll", icon: Wallet, permission: "finance.view" },
      { title: "Expenses", href: "/finance/expenses", icon: PieChart, permission: "finance.view" },
      { title: "Assets", href: "/assets", icon: Building2, permission: "assets.view" },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Announcements", href: "/announcements", icon: Megaphone, permission: "announcements.view" },
      { title: "Messages", href: "/messages", icon: MessageSquare, permission: "messages.view" },
      { title: "Events", href: "/events", icon: CalendarDays, permission: "events.view" },
      { title: "Reports", href: "/reports", icon: PieChart, permission: "reports.view" },
    ],
  },
  {
    label: "System",
    items: [{ title: "Settings", href: "/settings", icon: Settings, permission: "settings.view" }],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export const findNavItem = (href: string) => NAV_ITEMS.find((item) => href === item.href || href.startsWith(`${item.href}/`));

export const canSeeItem = (
  item: NavItem,
  can: (permission: Permission) => boolean,
) => can(item.permission) || (item.anyOf ? item.anyOf.some(can) : false);