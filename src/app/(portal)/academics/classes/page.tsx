"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, DoorOpen, Users } from "lucide-react";
import type { SchoolClass, Section, Subject } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";

export default function ClassesPage() {
  const lookups = useLookups();
  const { can } = useSession();
  const [query, setQuery] = useState("");

  const classes = lookups.classes
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.gradeLevel - b.gradeLevel);

  const totalStudents = lookups.students.filter((s) => s.status === "active").length;
  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);

  return (
    <>
      <PageHeader title="Classes & Sections" description={`${classes.length} classes across the academic year`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Classes" value={classes.length} icon={BookOpen} tone="info" />
        <StatCard label="Sections" value={lookups.sections.length} icon={DoorOpen} />
        <StatCard label="Enrolled Students" value={totalStudents} icon={Users} />
        <StatCard label="Overall Fill Rate" value={`${Math.round((totalStudents / Math.max(1, totalCapacity)) * 100)}%`} />
      </div>

      <div className="mb-4 max-w-xs">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a class..."
          aria-label="Find a class"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((cls) => {
          const sections = lookups.sections.filter((s) => s.classId === cls.id);
          const count = lookups.students.filter((s) => s.classId === cls.id && s.status === "active").length;
          const fill = Math.round((count / Math.max(1, cls.capacity)) * 100);

          return (
            <SectionCard
              key={cls.id}
              title={cls.name}
              description={`${sections.length} sections · ${cls.room ?? "Room TBA"}`}
              action={
                <Badge variant={fill > 95 ? "destructive" : fill > 80 ? "secondary" : "outline"}>{fill}% full</Badge>
              }
            >
              <Progress value={fill} className="mb-4" />

              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id} className="flex items-center gap-3">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{section.name.replace("Section ", "")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{section.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {lookups.teacherName(section.teacherId)}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {lookups.students.filter((s) => s.sectionId === section.id && s.status === "active").length}
                    </span>
                  </li>
                ))}
              </ul>

              {can("academics.manage") && (
                <Button variant="outline" size="sm" className="mt-4 w-full" render={<Link href={`/timetable?classId=${cls.id}`} />}>
                  View timetable
                </Button>
              )}
            </SectionCard>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-6 text-xs">
        Click any student record to open their full profile with results and attendance history.
      </p>
    </>
  );
}

export type { SchoolClass, Section, Subject };