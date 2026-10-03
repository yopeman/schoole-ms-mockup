import type {
  ActivityLog,
  AdmissionApplicant,
  Announcement,
  Asset,
  DocumentRecord,
  Exam,
  ExamScheduleEntry,
  Expense,
  FeeComponent,
  Invoice,
  InvoiceStatus,
  Message,
  MessageThread,
  Notification,
  Payment,
  PayrollRecord,
  Scholarship,
  SchoolEvent,
} from "@/types";
import type { Rng } from "../prng";
import { daysAgo, daysFrom } from "./helpers";
import { ACADEMIC_YEAR } from "./helpers";

const stamp = { createdAt: "2026-03-01T09:00:00.000Z", updatedAt: "2026-03-01T09:00:00.000Z" };

/* ----------------------------- Exams ------------------------------ */

export const exams: Exam[] = [
  { ...stamp, id: "exam-unit-1", name: "Unit Test I", academicYearId: ACADEMIC_YEAR.id, termId: "term-1", type: "unit_test", startDate: "2026-06-15", endDate: "2026-06-26", status: "published", classIds: [], subjectIds: [] },
  { ...stamp, id: "exam-mid-1", name: "Mid-Term Examination", academicYearId: ACADEMIC_YEAR.id, termId: "term-1", type: "midterm", startDate: "2026-08-24", endDate: "2026-09-04", status: "published", classIds: [], subjectIds: [] },
  { ...stamp, id: "exam-unit-2", name: "Unit Test II", academicYearId: ACADEMIC_YEAR.id, termId: "term-2", type: "unit_test", startDate: "2026-11-02", endDate: "2026-11-09", status: "ongoing", classIds: [], subjectIds: [] },
  { ...stamp, id: "exam-final", name: "Final Examination", academicYearId: ACADEMIC_YEAR.id, termId: "term-2", type: "final", startDate: "2027-02-10", endDate: "2027-03-05", status: "scheduled", classIds: [], subjectIds: [] },
];

export const buildExamSchedule = (
  rng: Rng,
  classes: { id: string; gradeLevel: number }[],
  subjects: { id: string; gradeLevels: number[]; maxMarks: number }[],
): ExamScheduleEntry[] => {
  const entries: ExamScheduleEntry[] = [];
  let day = 0;

  for (const exam of exams.filter((e) => e.type === "unit_test" && e.id === "exam-unit-1")) {
    for (const cls of classes) {
      const applicable = subjects.filter((s) => s.gradeLevels.includes(cls.gradeLevel));
      for (const subject of applicable) {
        day += 1;
        const examDate = new Date(`${exam.startDate}T00:00:00Z`);
        examDate.setUTCDate(examDate.getUTCDate() + (day % 10));
        entries.push({
          ...stamp,
          id: `sch-${exam.id}-${cls.id}-${subject.id}`,
          examId: exam.id,
          subjectId: subject.id,
          classId: cls.id,
          examDate: examDate.toISOString().slice(0, 10),
          startTime: "09:30",
          durationMinutes: 90,
          room: `${cls.id}-room`,
          maxMarks: subject.maxMarks,
        });
      }
    }
  }

  return entries;
};

/* ----------------------------- Finance ---------------------------- */

export const feeComponents: FeeComponent[] = [
  { ...stamp, id: "fee-tuition", name: "Tuition Fee", gradeLevels: [1,2,3,4,5,6,7,8,9,10,11,12], frequency: "quarterly", amount: 45000, mandatory: true },
  { ...stamp, id: "fee-term", name: "Term Fee", gradeLevels: [1,2,3,4,5,6,7,8,9,10], frequency: "annual", amount: 12000, mandatory: true },
  { ...stamp, id: "fee-term-ss", name: "Term Fee (Senior Secondary)", gradeLevels: [11,12], frequency: "annual", amount: 18000, mandatory: true },
  { ...stamp, id: "fee-transport", name: "Transport Fee", gradeLevels: [1,2,3,4,5,6,7,8,9,10,11,12], frequency: "monthly", amount: 3500, mandatory: false },
  { ...stamp, id: "fee-lab", name: "Laboratory Fee", gradeLevels: [9,10,11,12], frequency: "annual", amount: 8000, mandatory: true },
  { ...stamp, id: "fee-exam", name: "Examination Fee", gradeLevels: [9,10,11,12], frequency: "annual", amount: 5000, mandatory: true },
  { ...stamp, id: "fee-admission", name: "Admission Fee", gradeLevels: [1,2,3,4,5,6,7,8,9,10,11,12], frequency: "one_time", amount: 25000, mandatory: true },
];

export const buildInvoices = (rng: Rng, students: { id: string; discountPercent?: number }[]): Invoice[] => {
  const invoices: Invoice[] = [];
  const today = new Date();

  students.forEach((student, index) => {
    const termStart = new Date(today.getFullYear(), 3, 6);
    const tuition = 45000 + (index % 5) * 4000;
    const termFee = 12000;
    const labFee = 8000;
    const subtotal = tuition + termFee + labFee;
    const discountPercent = student.discountPercent ?? 0;
    const net = Math.round(subtotal * (1 - discountPercent / 100));

    const dueDate = new Date(termStart);
    dueDate.setDate(dueDate.getDate() + 30);
    const overdue = dueDate < today;

    const roll = rng.next();
    const paidPercent = roll < 0.62 ? 1 : roll < 0.85 ? 0.5 : roll < 0.95 ? 0.25 : 0;
    const paidAmount = Math.round(net * paidPercent);

    const status: InvoiceStatus =
      paidAmount >= net ? "paid" : paidAmount > 0 ? "partial" : overdue ? "overdue" : "issued";

    invoices.push({
      ...stamp,
      id: `inv-${index + 1}`,
      number: `SIS/26-27/${String(index + 1).padStart(4, "0")}`,
      studentId: student.id,
      academicYearId: ACADEMIC_YEAR.id,
      termId: "term-1",
      issuedDate: termStart.toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      items: [
        { name: "Tuition Fee (Term I)", amount: tuition },
        { name: "Term Fee", amount: termFee },
        { name: "Laboratory Fee", amount: labFee },
        ...(discountPercent > 0
          ? [{ name: `Scholarship / Discount ${discountPercent}%`, amount: net - subtotal }]
          : []),
      ],
      subtotal,
      discountPercent,
      total: net,
      paidAmount,
      balance: net - paidAmount,
      status,
    });
  });

  return invoices;
};

export const buildPayments = (rng: Rng, invoices: Invoice[]): Payment[] => {
  const payments: Payment[] = [];
  let receipt = 5000;

  for (const invoice of invoices) {
    if (invoice.paidAmount === 0) continue;
    payments.push({
      ...stamp,
      id: `pay-${receipt}`,
      receiptNumber: `RCPT/${receipt}`,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      amount: invoice.paidAmount,
      paidAt: daysAgo(rng.int(1, 120)),
      method: rng.pick(["cash", "bank_transfer", "card", "cheque", "online", "easypaisa"]),
      collectedById: "stf-001",
      remarks: rng.bool(0.2) ? "Part payment received" : undefined,
    });
    receipt += 1;
  }

  return payments;
};

export const buildExpenses = (rng: Rng): Expense[] => {
  const templates: { category: Expense["category"]; description: string; min: number; max: number }[] = [
    { category: "salaries", description: "Monthly staff salary payout", min: 900000, max: 1400000 },
    { category: "utilities", description: "Electricity and water bills", min: 40000, max: 90000 },
    { category: "maintenance", description: "Campus maintenance and repairs", min: 15000, max: 75000 },
    { category: "supplies", description: "Laboratory and library supplies", min: 20000, max: 60000 },
    { category: "transport", description: "School fleet fuel and servicing", min: 30000, max: 85000 },
    { category: "events", description: "Annual day and cultural events", min: 50000, max: 180000 },
    { category: "marketing", description: "Admission campaign and print media", min: 25000, max: 90000 },
    { category: "other", description: "Miscellaneous operational expenses", min: 10000, max: 40000 },
  ];

  return templates.map((template, index) => ({
    ...stamp,
    id: `exp-${index + 1}`,
    category: template.category,
    description: template.description,
    amount: rng.int(template.min, template.max),
    incurredDate: daysAgo(rng.int(2, 90)),
    paidTo: rng.pick(["Various Vendors", "City Power Ltd", "Sunrise Logistics", "Academic Supplies Co."]),
    approvedById: "stf-001",
    status: rng.pick(["approved", "paid", "paid", "pending"]),
  }));
};

export const buildPayroll = (staff: { id: string; salary: number }[]): PayrollRecord[] => {
  const months = ["2026-07", "2026-08", "2026-09", "2026-10"];
  const records: PayrollRecord[] = [];

  for (const member of staff) {
    months.forEach((month, index) => {
      const allowances = 5000 + index * 250;
      const deductions = 1200;
      records.push({
        ...stamp,
        id: `pay-${member.id}-${month}`,
        staffId: member.id,
        month,
        basicSalary: member.salary,
        allowances,
        deductions,
        netSalary: member.salary + allowances - deductions,
        status: month === "2026-10" ? "pending" : "paid",
      });
    });
  }

  return records;
};

export const scholarships: Scholarship[] = [
  { ...stamp, id: "sch-merit", name: "Merit Scholarship", amountPercent: 50, criteria: "Top 5% aggregate in previous term", studentIds: [], academicYearId: ACADEMIC_YEAR.id },
  { ...stamp, id: "sch-means", name: "Means Tested Aid", amountPercent: 75, criteria: "Family income below threshold", studentIds: [], academicYearId: ACADEMIC_YEAR.id },
  { ...stamp, id: "sch-rma", name: "Sports Merit", amountPercent: 40, criteria: "State-level representation", studentIds: [], academicYearId: ACADEMIC_YEAR.id },
];

/* ------------------------- Communication ------------------------- */

const announcementSeed: { title: string; body: string; audience: Announcement["audience"]; priority: Announcement["priority"]; days: number }[] = [
  { title: "Annual Sports Day — 12 November", body: "The Annual Sports Day will be held on 12 November 2026. All students from Grade 1 to Grade 12 must report to the north ground by 8:00 AM. Parents are welcome from 9:30 AM.", audience: "all", priority: "high", days: 1 },
  { title: "Parent–Teacher Meeting Schedule", body: "PTM for Grades 6 to 12 will be conducted between 22 and 26 November. Slot booking is now open through the parent portal.", audience: "families", priority: "normal", days: 2 },
  { title: "Unit Test II Timetable Published", body: "The Unit Test II timetable for Term II is now available on the examinations page. Examinations begin 2 November 2026.", audience: "students", priority: "high", days: 3 },
  { title: "Staff Meeting on Revised Attendance Policy", body: "All teaching and non-teaching staff are required to attend the briefing on the revised attendance policy this Friday at 3:30 PM in the conference hall.", audience: "staff", priority: "normal", days: 4 },
  { title: "Library Week Reading Challenge", body: "Library week runs through the end of the month. Students who log 5 books win a certificate and a book voucher.", audience: "students", priority: "low", days: 5 },
  { title: "Fee Payment Reminder — Term I Balance", body: "Term I balances that remain unpaid after 31 October will attract a late fee as per the school fee policy. Please clear outstanding amounts at the earliest.", audience: "families", priority: "urgent", days: 6 },
  { title: "Science Exhibition Guest Speaker", body: "Dr. Kavita Menon will deliver a guest lecture on sustainable engineering on 18 November in the auditorium.", audience: "students", priority: "normal", days: 8 },
  { title: "Bus Route 7 Timing Change", body: "Route 7 will now depart 15 minutes earlier due to increased traffic on the main corridor. Timings updated in the transport section.", audience: "families", priority: "normal", days: 9 },
  { title: "New Leave Policy for Teaching Staff", body: "Additional leave entitlements for academic staff are effective immediately. Contact the office for details.", audience: "teachers", priority: "normal", days: 11 },
  { title: "Inter-House Debate Championship", body: "Registrations are open for the Inter-House Debate Championship. Speak to your class teacher to enter.", audience: "students", priority: "low", days: 13 },
];

export const buildAnnouncements = (rng: Rng, authorIds: string[]): Announcement[] =>
  announcementSeed.map((item, index) => ({
    ...stamp,
    id: `ann-${index + 1}`,
    title: item.title,
    body: item.body,
    audience: item.audience,
    priority: item.priority,
    authorId: rng.pick(authorIds),
    publishedAt: `${daysAgo(item.days)}T08:30:00.000Z`,
    pinned: index === 0,
    readBy: [],
  }));

const eventSeed: { title: string; category: SchoolEvent["category"]; offset: number; time: string; location: string }[] = [
  { title: "Annual Sports Day", category: "sports", offset: 40, time: "08:00", location: "North Ground" },
  { title: "Unit Test II Begins", category: "exam", offset: 30, time: "09:30", location: "Examination Halls" },
  { title: "Parent–Teacher Meeting (Grades 6-12)", category: "meeting", offset: 49, time: "09:00", location: "Respective Classrooms" },
  { title: "Science Exhibition", category: "cultural", offset: 45, time: "10:00", location: "Auditorium" },
  { title: "Founder's Day Assembly", category: "academic", offset: 8, time: "08:00", location: "Main Assembly Ground" },
  { title: "Independence Day Holiday", category: "holiday", offset: -5, time: "", location: "" },
  { title: "Half Day — Staff Development", category: "meeting", offset: 21, time: "12:00", location: "Conference Hall" },
  { title: "Inter-House Debate Championship", category: "cultural", offset: 24, time: "11:00", location: "Seminar Hall" },
  { title: "Term II Fee Deadline", category: "meeting", offset: 14, time: "16:00", location: "Accounts Office" },
];

export const buildEvents = (rng: Rng, organizerIds: string[]): SchoolEvent[] =>
  eventSeed.map((item, index) => ({
    ...stamp,
    id: `evt-${index + 1}`,
    title: item.title,
    description: `${item.title} is scheduled as per the school academic calendar. Further details will be shared through announcements.`,
    category: item.category,
    startDate: item.offset >= 0 ? daysFrom(item.offset) : daysAgo(Math.abs(item.offset)),
    endDate: item.offset >= 0 ? daysFrom(item.offset) : daysAgo(Math.abs(item.offset)),
    startTime: item.time || undefined,
    location: item.location || undefined,
    organizerId: rng.pick(organizerIds),
    audience: item.category === "exam" ? "students" : item.category === "holiday" ? "all" : "all",
  }));

const threadSeed: { subject: string; body: string; senderIndex: number; replies: string[] }[] = [
  { subject: "Absence on 28 September — Class 5A", body: "Dear Ms. Rao, my child Aarav will be absent on 28 September for a family function. Kindly mark it as on-leave.", senderIndex: 0, replies: ["Noted. The class teacher has been informed and the leave has been recorded.", "Thank you for the quick update."] },
  { subject: "Term I report card collection", body: "When can we collect the Term I report cards? We are travelling next week.", senderIndex: 1, replies: ["Report cards are ready for collection from the school office between 3 PM and 5 PM, Monday to Friday."] },
  { subject: "Science fair project approval", body: "Requesting approval for the solar water purifier project for the inter-house exhibition.", senderIndex: 2, replies: ["Approved. Please submit the abstract to the science coordinator by Friday."] },
  { subject: "Fee payment receipt not received", body: "I paid the Term I fees online yesterday but have not received the receipt.", senderIndex: 3, replies: ["The payment has been reflected and the e-receipt has been emailed. Please check the spam folder."] },
  { subject: "Bus stop change request", body: "Could my children be shifted from the Model Colony stop to the school gate stop?", senderIndex: 4, replies: ["The request has been forwarded to the transport coordinator."] },
];

export const buildThreads = (
  rng: Rng,
  parents: string[],
  staffIds: string[],
): { threads: MessageThread[]; messages: Message[] } => {
  const threads: MessageThread[] = [];
  const messages: Message[] = [];

  threadSeed.forEach((thread, index) => {
    const parent = parents[index % parents.length];
    const staffId = staffIds[index % staffIds.length];
    const threadId = `thr-${index + 1}`;
    const lastMessageAt = `${daysAgo(rng.int(1, 12))}T${String(rng.int(9, 18)).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00.000Z`;

    threads.push({
      ...stamp,
      id: threadId,
      subject: thread.subject,
      participantIds: [parent, staffId],
      contextType: "student",
      lastMessageAt,
    });

    messages.push({
      ...stamp,
      id: `msg-${threadId}-1`,
      threadId,
      senderId: parent,
      body: thread.body,
      readBy: [parent],
      createdAt: `${daysAgo(rng.int(2, 14))}T10:12:00.000Z`,
    });

    thread.replies.forEach((body, replyIndex) => {
      const senderId = replyIndex % 2 === 0 ? staffId : parent;
      messages.push({
        ...stamp,
        id: `msg-${threadId}-${replyIndex + 2}`,
        threadId,
        senderId,
        body,
        readBy: [senderId],
        createdAt: lastMessageAt,
      });
    });
  });

  return { threads, messages };
};

export const buildNotifications = (userId: string, role: string): Notification[] => {
  const templates =
    role === "family"
      ? [
          ["Fee reminder", "Term I balance is pending. Please clear at the earliest."],
          ["New announcement", "Parent–Teacher Meeting schedule is now available."],
          ["Attendance update", "Your child was marked absent yesterday."],
        ]
      : role === "student"
        ? [
            ["New announcement", "Unit Test II timetable has been published."],
            ["Grade posted", "Mathematics Unit Test I marks are now available."],
          ]
        : [
            ["Task assigned", "Marks entry is pending for Unit Test II."],
            ["New message", "You have an unread message from the front office."],
          ];

  return templates.map(([title, body], index) => ({
    ...stamp,
    id: `ntf-${userId}-${index}`,
    userId,
    title,
    body,
    type: index === 0 ? "system" : "announcement",
    link: "/dashboard",
    read: index > 1,
  }));
};

export const buildActivityLogs = (rng: Rng, actors: { id: string; name: string }[]): ActivityLog[] => {
  const templates: { action: string; entity: string; description: (name: string) => string }[] = [
    { action: "created", entity: "student", description: (n) => `${n} onboarded a new student` },
    { action: "updated", entity: "fee", description: (n) => `${n} recorded a fee payment` },
    { action: "published", entity: "announcement", description: (n) => `${n} published an announcement` },
    { action: "marked", entity: "attendance", description: (n) => `${n} submitted attendance for a class` },
    { action: "approved", entity: "expense", description: (n) => `${n} approved an expense claim` },
    { action: "updated", entity: "exam", description: (n) => `${n} published midterm results` },
    { action: "created", entity: "admission", description: (n) => `${n} converted an inquiry to an application` },
  ];

  return Array.from({ length: 24 }, (_, index) => {
    const actor = rng.pick(actors);
    const template = rng.pick(templates);
    return {
      ...stamp,
      id: `act-${index + 1}`,
      actorId: actor.id,
      actorName: actor.name,
      action: template.action,
      entity: template.entity,
      description: template.description(actor.name),
      createdAt: `${daysAgo(rng.int(0, 14))}T${String(rng.int(8, 19)).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00.000Z`,
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/* ------------------------ Admissions & Assets ------------------------ */

export const buildApplicants = (rng: Rng, firstNames: string[], lastNames: string[]): AdmissionApplicant[] => {
  const statuses: AdmissionApplicant["status"][] = ["inquiry", "application", "under_review", "interview", "offered", "enrolled"];
  const documentNames = ["Birth Certificate", "Previous School TC", "Passport Size Photo", "Address Proof"];

  return Array.from({ length: 18 }, (_, index) => {
    const firstName = rng.pick(firstNames);
    const lastName = rng.pick(lastNames);
    const status = rng.pick(statuses);
    const gradeLevel = rng.int(1, 10) as AdmissionApplicant["gradeLevel"];

    return {
      ...stamp,
      id: `app-${index + 1}`,
      applicationNumber: `ADM/26/${String(index + 1).padStart(3, "0")}`,
      firstName,
      lastName,
      gender: rng.bool(0.5) ? "male" : "female",
      dateOfBirth: `${2018 - gradeLevel}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
      gradeLevel,
      previousSchool: `${rng.pick(["Sunrise", "Green Valley", "Modern", "National"])} School`,
      parentName: `${rng.pick(firstNames)} ${lastName}`,
      parentPhone: `9${rng.int(100000000, 999999999)}`,
      parentEmail: `parent${index + 1}@mail.com`,
      status,
      appliedAt: `${daysAgo(rng.int(2, 60))}T10:00:00.000Z`,
      interviewDate: status === "interview" ? daysFrom(rng.int(2, 12)) : undefined,
      score: rng.int(40, 98),
      documents: documentNames.map((name) => ({ name, submitted: rng.bool(0.75) })),
      notes: rng.bool(0.3) ? "Parent requested fee concession." : undefined,
    };
  });
};

export const buildAssets = (rng: Rng, locations: string[]): Asset[] => {
  const catalog: { name: string; category: Asset["category"]; value: number }[] = [
    { name: "Interactive Smart Board", category: "electronics", value: 85000 },
    { name: "Student Desk Set", category: "furniture", value: 4200 },
    { name: "Science Lab Microscope", category: "lab", value: 32000 },
    { name: "Library Book Rack", category: "furniture", value: 18000 },
    { name: "Basketball Hoop System", category: "sports", value: 45000 },
    { name: "CCTV Camera Node", category: "electronics", value: 12000 },
    { name: "Chemistry Fume Hood", category: "lab", value: 165000 },
    { name: "School Bus", category: "vehicle", value: 1800000 },
    { name: "Projector 4000 Lumens", category: "electronics", value: 56000 },
    { name: "Exam Invigilator Chair", category: "furniture", value: 2600 },
    { name: "First Aid Kit", category: "other", value: 3500 },
    { name: "Server Rack", category: "electronics", value: 240000 },
  ];

  return catalog.map((item, index) => ({
    ...stamp,
    id: `ast-${index + 1}`,
    name: item.name,
    category: item.category,
    code: `AST-${String(1000 + index)}`,
    location: rng.pick(locations),
    purchaseDate: daysAgo(rng.int(90, 1800)),
    purchaseValue: item.value,
    condition: rng.pick(["new", "good", "good", "needs_repair", "damaged"]),
    assignedTo: rng.bool(0.4) ? rng.pick(locations) : undefined,
  }));
};

export const buildDocuments = (rng: Rng, students: { id: string }[], teachers: { id: string }[]): DocumentRecord[] => {
  const studentDocs = ["Birth Certificate", "Aadhaar Card", "Transfer Certificate", "Previous Report Card", "Address Proof"];
  const staffDocs = ["Appointment Letter", "PAN Card", "Experience Letter", "Qualification Certificate"];

  return [
    ...students.slice(0, 40).map((student, index) => ({
      ...stamp,
      id: `doc-s-${index + 1}`,
      ownerType: "student" as const,
      ownerId: student.id,
      name: studentDocs[index % studentDocs.length],
      type: (index % 4 === 0 ? "birth_certificate" : index % 4 === 1 ? "id_card" : index % 4 === 2 ? "certificate" : "other") as DocumentRecord["type"],
      sizeKb: rng.int(120, 2400),
      uploadedAt: `${daysAgo(rng.int(30, 700))}T12:00:00.000Z`,
    })),
    ...teachers.slice(0, 12).map((teacher, index) => ({
      ...stamp,
      id: `doc-t-${index + 1}`,
      ownerType: "teacher" as const,
      ownerId: teacher.id,
      name: staffDocs[index % staffDocs.length],
      type: (index % 2 === 0 ? "certificate" : "other") as DocumentRecord["type"],
      sizeKb: rng.int(90, 900),
      uploadedAt: `${daysAgo(rng.int(60, 1200))}T12:00:00.000Z`,
    })),
  ];
};