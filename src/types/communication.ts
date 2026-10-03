import type { EntityMeta } from "./common";

export type AnnouncementAudience =
  | "all"
  | "students"
  | "families"
  | "teachers"
  | "staff"
  | "class";

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export type Announcement = EntityMeta & {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceRefId?: string;
  priority: AnnouncementPriority;
  authorId: string;
  publishedAt: string;
  expiresAt?: string;
  pinned: boolean;
  attachmentUrl?: string;
  readBy: string[];
};

export type EventCategory =
  | "academic"
  | "sports"
  | "cultural"
  | "meeting"
  | "holiday"
  | "exam"
  | "birthday";

export type SchoolEvent = EntityMeta & {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  organizerId: string;
  audience: AnnouncementAudience;
};

export type MessageThread = EntityMeta & {
  id: string;
  subject: string;
  participantIds: string[];
  contextType?: "student" | "class" | "finance";
  contextId?: string;
  lastMessageAt: string;
};

export type Message = EntityMeta & {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  readBy: string[];
};

export type Notification = EntityMeta & {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "announcement" | "message" | "fee" | "grade" | "attendance" | "system";
  link?: string;
  read: boolean;
};

export type ActivityLog = EntityMeta & {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
};

export type DocumentRecord = EntityMeta & {
  id: string;
  ownerType: "student" | "teacher" | "staff" | "family";
  ownerId: string;
  name: string;
  type: "birth_certificate" | "report_card" | "id_card" | "photo" | "certificate" | "other";
  sizeKb: number;
  uploadedAt: string;
};