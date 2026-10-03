"use client";

import { useMemo } from "react";
import type { Subject } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";

const CATEGORY_LABELS: Record<Subject["category"], string> = {
  core: "Core",
  elective: "Elective",
  languages: "Language",
  science: "Science",
  commerce: "Commerce",
  arts: "Arts",
  physical_education: "Physical Education",
};

export default function SubjectsPage() {
  const lookups = useLookups();
  const table = useDataTable<Subject>("subjects", { initialSort: "name" });

  const teacherCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const teacher of lookups.teachers) {
      for (const subjectId of teacher.subjects) {
        map.set(subjectId, (map.get(subjectId) ?? 0) + 1);
      }
    }
    return map;
  }, [lookups.teachers]);

  const columns: Column<Subject>[] = [
    {
      key: "name",
      header: "Subject",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-muted-foreground text-xs">{row.code}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      cell: (row) => <Badge variant="secondary">{CATEGORY_LABELS[row.category]}</Badge>,
    },
    {
      key: "gradeLevels",
      header: "Grades",
      secondary: true,
      sortable: true,
      sortValue: (row) => row.gradeLevels.length,
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {row.gradeLevels.length === 12
            ? "All grades"
            : `Grades ${[...row.gradeLevels].sort((a, b) => a - b).join(", ")}`}
        </span>
      ),
    },
    { key: "maxMarks", header: "Max Marks", align: "right", sortable: true },
    { key: "passMarks", header: "Pass Marks", align: "right", secondary: true, sortable: true },
    { key: "credits", header: "Credits", align: "right", secondary: true, sortable: true },
    {
      key: "teachers",
      header: "Teachers",
      align: "center",
      secondary: true,
      cell: (row) => teacherCount.get(row.id) ?? 0,
    },
  ];

  return (
    <>
      <PageHeader title="Subjects" description={`${table.total} subjects on the curriculum`} />

      <DataTable
        rows={table.data}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search subjects..." }}
        filters={[
          {
            key: "category",
            label: "category",
            options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
        filterValues={table.state.filters}
        onFilterChange={table.setFilter}
        sort={{ key: table.state.sortKey, dir: table.state.sortDir, onChange: table.setSort }}
        pagination={{
          page: table.state.page,
          pageCount: table.pageCount,
          total: table.total,
          pageSize: table.state.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        exportName="subjects"
        empty={{ title: "No subjects found" }}
      />
    </>
  );
}