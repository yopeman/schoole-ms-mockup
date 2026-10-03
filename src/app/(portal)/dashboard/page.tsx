"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Megaphone,
  Percent,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth/session";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { money } from "@/lib/mock/constants";
import {
  AdmissionFunnel,
  AnnouncementList,
  AttendanceTrend,
  CollectionTrend,
  EnrollmentTrend,
  GenderSplit,
  GradeDistributionChart,
  SubjectPerformanceBars,
  TopPerformers,
  UpcomingEvents,
} from "@/components/dashboard/charts";
import {
  AtRiskList,
  AttendanceSummaryPanel,
  BirthdayList,
  FinanceOverview,
  PendingTasks,
  QuickActions,
  RecentApplicants,
  TodaySchedule,
} from "@/components/dashboard/widgets";

export default function DashboardPage() {
  const { role, user } = useSession();
  const data = useDashboardData();

  // The clock differs between the server render and the client, so resolve the
  // greeting after mount to keep hydration output stable.
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  if (!role) return null;

  return (
    <>
      <PageHeader
        title={`${greeting}, ${ROLE_LABELS[role]}`}
        description={
          role === "family"
            ? "An overview of your children's attendance, results and fees."
            : role === "student"
              ? "Your schedule, attendance and latest results."
              : "Here is what is happening across the school today."
        }
        badge={<Badge variant="outline">Academic Year 2026-27</Badge>}
      />

      {role === "admin" || role === "director" ? <LeadershipDashboard data={data} /> : null}
      {role === "teacher" ? <TeacherDashboard data={data} /> : null}
      {role === "student" ? <StudentDashboard data={data} /> : null}
      {role === "family" ? <FamilyDashboard data={data} userName={user?.email} /> : null}
      {role === "staff" ? <StaffDashboard data={data} /> : null}
      {role === "accountant" ? <FinanceDashboard data={data} /> : null}
    </>
  );
}

type Data = ReturnType<typeof useDashboardData>;

const LeadershipDashboard = ({ data }: { data: Data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active Students" value={data.people.students.total} icon={GraduationCap} hint={`${data.people.students.newAdmissions} new this year`} tone="info" />
      <StatCard label="Teaching Staff" value={data.people.teachers.total} icon={Users} hint={`Avg rating ${data.people.teachers.averageRating}/5`} />
      <StatCard label="Attendance Rate" value={`${data.attendance.rate}%`} icon={Percent} hint="Last 30 school days" tone={data.attendance.rate >= 90 ? "positive" : "warning"} />
      <StatCard label="Fee Collected" value={money(data.finance.collected)} icon={Receipt} hint={`${data.finance.collectionRate}% of billed`} tone="positive" />
    </div>

    <QuickActions
      actions={[
        { href: "/students", label: "Student directory", icon: GraduationCap },
        { href: "/attendance", label: "Mark attendance", icon: ClipboardCheck },
        { href: "/exams", label: "Enter marks", icon: FileSpreadsheet },
        { href: "/reports", label: "View reports", icon: TrendingUp },
      ]}
    />

    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <EnrollmentTrend data={data.enrollment.trend} />
        <AttendanceTrend data={data.attendance.dailyRate} />
      </div>
      <div className="space-y-6">
        <GenderSplit male={data.people.students.male} female={data.people.students.female} total={data.people.students.total} />
        <AdmissionFunnel data={data.admissions.byStatus} />
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <TopPerformers data={data.results.topPerformers} className={data.className} />
      <GradeDistributionChart data={data.results.gradeDistribution} />
      <UpcomingEventsWrapper data={data} />
    </div>
  </div>
);

const TeacherDashboard = ({ data }: { data: Data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="My Students" value={data.people.students.total} icon={GraduationCap} hint="Across assigned sections" tone="info" />
      <StatCard label="My Sections" value={data.classes.list.filter((c) => c.studentCount > 0).length} icon={BookOpen} />
      <StatCard label="Class Attendance" value={`${data.attendance.rate}%`} icon={Percent} tone={data.attendance.rate >= 90 ? "positive" : "warning"} />
      <StatCard label="At Risk" value={data.atRisk.length} icon={ClipboardCheck} tone={data.atRisk.length > 0 ? "danger" : "positive"} hint="Below 85% attendance" />
    </div>

    <QuickActions
      actions={[
        { href: "/attendance", label: "Mark attendance", icon: ClipboardCheck },
        { href: "/exams", label: "Enter marks", icon: FileSpreadsheet },
        { href: "/students", label: "My students", icon: GraduationCap },
        { href: "/timetable", label: "My timetable", icon: BookOpen },
      ]}
    />

    <div className="grid gap-6 xl:grid-cols-2">
      <TodaySchedule slots={data.todaySlots} subjectName={data.subjectName} />
      <div className="space-y-6">
        <AttendanceSummaryPanel attendance={data.attendance} />
        <SubjectPerformanceBars data={data.results.bySubject} />
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <AtRiskList data={data.atRisk} className={data.className} />
      <UpcomingEventsWrapper data={data} />
      <AnnouncementList data={data.content.announcements} />
    </div>
  </div>
);

const StudentDashboard = ({ data }: { data: Data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="My Attendance" value={`${data.attendance.rate}%`} icon={Percent} tone={data.attendance.rate >= 90 ? "positive" : "warning"} />
      <StatCard label="Classes" value={data.classes.list.filter((c) => c.studentCount > 0).length} icon={BookOpen} />
      <StatCard label="Latest Average" value={data.results.topPerformers[0] ? `${data.results.topPerformers[0].average}%` : "—"} icon={TrendingUp} />
      <StatCard label="Absent Days" value={data.attendance.absent} icon={ClipboardCheck} tone={data.attendance.absent > 3 ? "danger" : "default"} />
    </div>

    <QuickActions
      actions={[
        { href: "/timetable", label: "My timetable", icon: BookOpen },
        { href: "/exams", label: "My results", icon: FileSpreadsheet },
        { href: "/attendance", label: "Attendance record", icon: ClipboardCheck },
        { href: "/announcements", label: "Announcements", icon: Megaphone },
      ]}
    />

    <div className="grid gap-6 xl:grid-cols-2">
      <AttendanceSummaryPanel attendance={data.attendance} />
      <SubjectPerformanceBars data={data.results.bySubject} />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <UpcomingEventsWrapper data={data} />
      <AnnouncementList data={data.content.announcements} />
    </div>
  </div>
);

const FamilyDashboard = ({ data }: { data: Data; userName?: string }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Children Enrolled" value={data.people.students.total} icon={GraduationCap} tone="info" />
      <StatCard label="Attendance" value={`${data.attendance.rate}%`} icon={Percent} tone={data.attendance.rate >= 90 ? "positive" : "warning"} />
      <StatCard label="Fee Outstanding" value={money(data.finance.outstanding)} icon={Receipt} tone={data.finance.outstanding > 0 ? "warning" : "positive"} />
      <StatCard label="Classes" value={data.classes.list.length} icon={BookOpen} />
    </div>

    <QuickActions
      actions={[
        { href: "/attendance", label: "Attendance record", icon: ClipboardCheck },
        { href: "/exams", label: "View results", icon: FileSpreadsheet },
        { href: "/finance/fees", label: "Pay fees", icon: Wallet },
        { href: "/messages", label: "Contact teacher", icon: Megaphone },
      ]}
    />

    <div className="grid gap-6 xl:grid-cols-2">
      <AttendanceSummaryPanel attendance={data.attendance} />
      <FinanceOverview finance={data.finance} showPayroll={false} />
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <SubjectPerformanceBars data={data.results.bySubject} />
      <UpcomingEventsWrapper data={data} />
      <AnnouncementList data={data.content.announcements} />
    </div>
  </div>
);

const StaffDashboard = ({ data }: { data: Data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Admissions In Pipeline" value={data.admissions.total} icon={ClipboardCheck} tone="info" />
      <StatCard label="Active Students" value={data.people.students.total} icon={GraduationCap} />
      <StatCard label="Assets Needing Repair" value={data.operations.assetsNeedingRepair} icon={BookOpen} tone={data.operations.assetsNeedingRepair > 0 ? "warning" : "positive"} />
      <StatCard label="Non-Teaching Staff" value={data.people.staff} icon={Users} />
    </div>

    <QuickActions
      actions={[
        { href: "/admissions", label: "Process applications", icon: ClipboardCheck },
        { href: "/students", label: "Student registry", icon: GraduationCap },
        { href: "/assets", label: "Asset register", icon: BookOpen },
        { href: "/events", label: "Event calendar", icon: Megaphone },
      ]}
    />

    <div className="grid gap-6 xl:grid-cols-2">
      <AdmissionFunnel data={data.admissions.byStatus} />
      <UpcomingEventsWrapper data={data} />
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <RecentApplicants applicants={data.admissions.recent} />
      <BirthdayList data={data.operations.birthdays} className={data.className} />
      <AnnouncementList data={data.content.announcements} />
    </div>
  </div>
);

const FinanceDashboard = ({ data }: { data: Data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Billed" value={money(data.finance.billed)} icon={Receipt} />
      <StatCard label="Collected" value={money(data.finance.collected)} icon={Wallet} tone="positive" hint={`${data.finance.collectionRate}% collected`} />
      <StatCard label="Outstanding" value={money(data.finance.outstanding)} icon={TrendingUp} tone="warning" />
      <StatCard label="Overdue Invoices" value={data.finance.overdueCount} icon={ClipboardCheck} tone={data.finance.overdueCount > 0 ? "danger" : "positive"} hint={money(data.finance.overdueAmount)} />
    </div>

    <QuickActions
      actions={[
        { href: "/finance/fees", label: "Fees & invoices", icon: Receipt },
        { href: "/finance/payroll", label: "Run payroll", icon: Wallet },
        { href: "/finance/expenses", label: "Record expense", icon: FileSpreadsheet },
        { href: "/reports", label: "Financial reports", icon: TrendingUp },
      ]}
    />

    <div className="grid gap-6 xl:grid-cols-2">
      <CollectionTrend data={data.finance.collectionTrend} />
      <FinanceOverview finance={data.finance} showPayroll />
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <PendingTasks
        tasks={[
          { id: "fees", label: "Follow up overdue fees", description: `${data.finance.overdueCount} invoices past due`, href: "/finance/fees", icon: Receipt },
          { id: "payroll", label: "Process staff payroll", description: `${data.finance.pendingPayroll} records pending`, href: "/finance/payroll", icon: Wallet },
          { id: "expenses", label: "Approve expense claims", description: "Pending approvals require review", href: "/finance/expenses", icon: FileSpreadsheet },
        ]}
      />
      <AtRiskList data={data.atRisk} className={data.className} />
      <UpcomingEventsWrapper data={data} />
    </div>
  </div>
);

const UpcomingEventsWrapper = ({ data }: { data: Data }) => (
  <div className="h-full">
    <UpcomingEvents data={data.content.upcomingEvents} />
  </div>
);