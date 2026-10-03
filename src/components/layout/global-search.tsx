"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Student, Teacher } from "@/types";
import { db } from "@/lib/mock/server";
import { useSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NAV_ITEMS, canSeeItem, type NavItem } from "./nav-config";

type SearchHit = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  group: string;
};

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { can } = useSession();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const term = query.trim().toLowerCase();

  const [peopleHits, setPeopleHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    let active = true;
    if (term.length < 2) {
      setPeopleHits([]);
      return;
    }

    const load = async () => {
      const hits: SearchHit[] = [];

      if (can("students.view") || can("students.viewOwn")) {
        const { rows } = await db.list<Student>("students", {
          pageSize: 6,
          search: term,
          searchFields: ["firstName", "lastName", "studentCode"],
        });
        for (const student of rows) {
          hits.push({
            id: student.id,
            label: `${student.firstName} ${student.lastName}`,
            sublabel: student.studentCode,
            href: `/students/${student.id}`,
            group: "Students",
          });
        }
      }

      if (can("teachers.view")) {
        const { rows } = await db.list<Teacher>("teachers", {
          pageSize: 4,
          search: term,
          searchFields: ["firstName", "lastName", "employeeCode"],
        });
        for (const teacher of rows) {
          hits.push({
            id: teacher.id,
            label: `${teacher.firstName} ${teacher.lastName}`,
            sublabel: teacher.designation,
            href: `/teachers/${teacher.id}`,
            group: "Teachers",
          });
        }
      }

      if (active) setPeopleHits(hits);
    };

    void load();
    return () => {
      active = false;
    };
  }, [term, can]);

  const pageHits = useMemo<NavItem[]>(
    () =>
      NAV_ITEMS.filter((item) => canSeeItem(item, can)).filter((item) => item.title.toLowerCase().includes(term)),
    [term, can],
  );

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search students, teachers and pages</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b px-4">
          <Search className="text-muted-foreground size-4" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students, teachers, pages..."
            className="h-12 border-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="text-muted-foreground bg-muted hidden rounded px-1.5 py-0.5 text-xs sm:block">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {term.length < 2 ? (
            <div className="p-2">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">Quick links</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {NAV_ITEMS.filter((item) => canSeeItem(item, can))
                  .slice(0, 8)
                  .map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => go(item.href)}
                    >
                      <item.icon className="size-4" />
                      {item.title}
                    </Button>
                  ))}
              </div>
            </div>
          ) : pageHits.length === 0 && peopleHits.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No results for “{query}”</p>
          ) : (
            <>
              {pageHits.length > 0 && (
                <section className="mb-2">
                  <p className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase">Pages</p>
                  {pageHits.map((item) => (
                    <Button key={item.href} variant="ghost" className="w-full justify-start" onClick={() => go(item.href)}>
                      <item.icon className="size-4" />
                      {item.title}
                    </Button>
                  ))}
                </section>
              )}

              {peopleHits.length > 0 && (
                <section>
                  <p className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase">People</p>
                  {peopleHits.map((hit) => (
                    <Button key={hit.id} variant="ghost" className="w-full justify-start" onClick={() => go(hit.href)}>
                      <span className="flex-1 truncate text-left">{hit.label}</span>
                      <Badge variant="secondary">{hit.group}</Badge>
                      <span className="text-muted-foreground text-xs">{hit.sublabel}</span>
                    </Button>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}