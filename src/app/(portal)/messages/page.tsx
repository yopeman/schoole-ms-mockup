"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import type { Message, MessageThread } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { profileId, role, user } = useSession();
  const lookups = useLookups();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Front-office roles oversee every conversation; everyone else sees their own.
  const isFrontOffice = ["admin", "director", "accountant", "staff"].includes(role ?? "");

  const loadThreads = async () => {
    const all = db.all<MessageThread>("threads");
    const myIds = [profileId, user?.id].filter(Boolean) as string[];
    const mine = isFrontOffice ? all : all.filter((t) => t.participantIds.some((id) => myIds.includes(id)));
    setThreads([...mine].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
    setLoading(false);
    return mine;
  };

  useEffect(() => {
    void (async () => {
      const mine = await loadThreads();
      if (mine.length > 0 && !activeId) setActiveId(mine[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, role]);

  const loadMessages = async (threadId: string) => {
    const all = db.all<Message>("messages").filter((m) => m.threadId === threadId);
    setMessages(all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  };

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const active = threads.find((t) => t.id === activeId);
  const myIds = [profileId, user?.id].filter(Boolean) as string[];

  const counterpart = (thread?: MessageThread) => {
    if (!thread) return "—";
    const otherId = isFrontOffice
      ? thread.participantIds.map((id) => lookups.guardianName(id)).find((name) => name !== "—")
      : thread.participantIds.find((id) => !myIds.includes(id));

    if (!otherId) return "Unknown contact";
    const name = isFrontOffice ? otherId : lookups.guardianName(otherId);
    return name !== "—" ? name : lookups.staffName(otherId ?? "");
  };

  const mySenderId = profileId ?? user?.id ?? "stf-001";

  const send = async () => {
    if (!draft.trim() || !activeId) return;
    const body = draft.trim();

    await db.create<Message>("messages", {
      threadId: activeId,
      senderId: mySenderId,
      body,
      readBy: [mySenderId],
    } as never);
    await db.update<MessageThread>("threads", activeId, { lastMessageAt: new Date().toISOString() });

    setDraft("");
    await loadMessages(activeId);
    await loadThreads();
    toast.success("Message sent");
  };

  const unreadFor = (thread: MessageThread) =>
    db.all<Message>("messages").filter((m) => m.threadId === thread.id && !m.readBy.includes(mySenderId)).length;

  const totalUnread = threads.reduce((sum, t) => sum + unreadFor(t), 0);

  return (
    <>
      <PageHeader title="Messages" description="Conversations with teachers, parents and the front office" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Threads" value={threads.length} icon={MessageSquare} tone="info" />
        <StatCard label="Unread" value={totalUnread} tone={totalUnread ? "warning" : "positive"} />
        <StatCard label="Messages" value={messages.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border lg:col-span-1">
          <p className="bg-muted/50 border-b px-4 py-2.5 text-sm font-medium">Conversations</p>
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-muted h-14 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No conversations" description="Threads you are part of appear here." />
          ) : (
            <ul className="divide-border divide-y">
              {threads.map((thread) => {
                const last = db.all<Message>("messages").find((m) => m.id.endsWith("-1") && m.threadId === thread.id);
                const unread = unreadFor(thread);
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(thread.id)}
                      className={cn(
                        "hover:bg-muted/60 w-full px-4 py-3 text-left transition-colors",
                        activeId === thread.id && "bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{counterpart(thread).slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{counterpart(thread)}</p>
                          <p className="text-muted-foreground truncate text-xs">{thread.subject}</p>
                        </div>
                        {unread > 0 && <Badge variant="destructive">{unread}</Badge>}
                      </div>
                      {last && <p className="text-muted-foreground mt-1.5 truncate text-xs">{last.body}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex min-h-96 flex-col overflow-hidden rounded-xl border lg:col-span-2">
          {!active ? (
            <EmptyState icon={MessageSquare} title="Select a conversation" className="h-full rounded-none border-0 shadow-none" />
          ) : (
            <>
              <div className="bg-muted/50 border-b px-4 py-3">
                <p className="text-sm font-medium">{counterpart(active)}</p>
                <p className="text-muted-foreground text-xs">{active.subject}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => {
                  const mine = message.senderId === mySenderId;
                  const sender = lookups.staffName(message.senderId);
                  return (
                    <div key={message.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {mine ? "You" : sender.split(" ").map((w) => w[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-[75%]", mine && "items-end text-right")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-sm",
                            mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
                          )}
                        >
                          {message.body}
                        </div>
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {new Date(message.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Write a message..."
                  rows={2}
                  className="min-h-10 resize-none"
                  aria-label="Message"
                />
                <Button onClick={send} disabled={!draft.trim()} aria-label="Send message">
                  <Send className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}