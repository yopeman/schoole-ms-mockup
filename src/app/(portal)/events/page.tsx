"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { SchoolEvent } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLookups } from "@/hooks/use-lookups";
import { db } from "@/lib/mock/server";
import { TODAY, dateLabel } from "@/lib/mock/constants";
import { cn } from "@/lib/utils";

const CATEGORY_TONES: Record<SchoolEvent["category"], string> = {
  academic: "bg-blue-100 dark:bg-blue-950",
  sports: "bg-emerald-100 dark:bg-emerald-950",
  cultural: "bg-violet-100 dark:bg-violet-950",
  meeting: "bg-amber-100 dark:bg-amber-950",
  holiday: "bg-red-100 dark:bg-red-950",
  exam: "bg-cyan-100 dark:bg-cyan-950",
  birthday: "bg-pink-100 dark:bg-pink-950",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EventsPage() {
  const lookups = useLookups();
  const [cursor, setCursor] = useState(() => new Date(`${TODAY}T00:00:00Z`));
  const [selected, setSelected] = useState<string | null>(null);

  const events = useMemo(() => db.all<SchoolEvent>("events"), []);

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    // Monday-first grid.
    const leading = (first.getUTCDay() + 6) % 7;

    const list: { date: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < leading; i += 1) {
      const d = new Date(Date.UTC(year, month, -(leading - i - 1)));
      list.push({ date: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push({ date: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10), day, inMonth: true });
    }
    while (list.length % 7 !== 0) {
      const d = new Date(Date.UTC(year, month + 1, list.length - leading - daysInMonth + 1));
      list.push({ date: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: false });
    }
    return list;
  }, [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, SchoolEvent[]>();
    for (const event of events) {
      map.set(event.startDate, [...(map.get(event.startDate) ?? []), event]);
    }
    return map;
  }, [events]);

  const upcoming = events.filter((e) => e.startDate >= TODAY).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const thisMonth = events.filter((e) => e.startDate.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`);
  const selectedEvent = events.find((e) => e.id === selected);

  return (
    <>
      <PageHeader title="Events & Calendar" description="Academic calendar, exams, events and holidays" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="This Month" value={thisMonth.length} icon={CalendarDays} tone="info" />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Exams" value={events.filter((e) => e.category === "exam").length} />
        <StatCard label="Holidays" value={events.filter((e) => e.category === "holiday").length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {MONTH_NAMES[month]} {year}
              </h2>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous month"
                  onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(`${TODAY}T00:00:00Z`))}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next month"
                  onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const dayEvents = byDate.get(cell.date) ?? [];
                const isToday = cell.date === TODAY;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelected(dayEvents[0]?.id ?? null)}
                    className={cn(
                      "relative min-h-16 rounded-lg border p-1.5 text-left text-sm transition-colors",
                      cell.inMonth ? "hover:border-primary/40" : "text-muted-foreground/50 border-transparent",
                      isToday && "border-primary ring-primary/20 ring-2",
                      selected && dayEvents.some((e) => e.id === selected) && "bg-muted",
                    )}
                  >
                    <span className={cn("font-medium", isToday && "text-primary")}>{cell.day}</span>
                    <span className="mt-1 flex flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className={cn("truncate rounded px-1 py-0.5 text-[10px]", CATEGORY_TONES[event.category])}
                        >
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-muted-foreground px-1 text-[10px]">+{dayEvents.length - 2} more</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {(["academic", "exam", "sports", "cultural", "meeting", "holiday"] as const).map((category) => (
                <span key={category} className="text-muted-foreground flex items-center gap-1.5 capitalize">
                  <span className={cn("size-2.5 rounded-full", CATEGORY_TONES[category])} />
                  {category}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SectionCard title="Upcoming Events" description={`${upcoming.length} scheduled`}>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing scheduled" />
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 8).map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 flex-col items-center justify-center rounded-md">
                      <span className="text-[10px] leading-none font-medium uppercase">
                        {new Date(`${event.startDate}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}
                      </span>
                      <span className="text-sm leading-tight font-semibold">
                        {new Date(`${event.startDate}T00:00:00Z`).getUTCDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="text-muted-foreground text-xs">{event.location ?? "School campus"}</p>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {event.category}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {selectedEvent && (
            <SectionCard title={selectedEvent.title}>
              <p className="text-muted-foreground text-sm">{selectedEvent.description}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground size-3.5" />
                  {dateLabel(selectedEvent.startDate)}
                  {selectedEvent.startTime && ` · ${selectedEvent.startTime}`}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="text-muted-foreground size-3.5" />
                  {selectedEvent.location ?? "School campus"}
                </div>
                <div className="text-muted-foreground text-xs">Organised by {lookups.staffName(selectedEvent.organizerId)}</div>
              </dl>
            </SectionCard>
          )}
        </div>
      </div>
    </>
  );
}