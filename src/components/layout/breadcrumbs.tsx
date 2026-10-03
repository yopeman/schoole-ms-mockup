"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** Breadcrumbs derived from the current path, rooted at the matching nav item. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const rootIndex = segments.findIndex((_, index) => NAV_ITEMS.some((item) => item.href === `/${segments.slice(0, index + 1).join("/")}`));
  const rootSegments = rootIndex >= 0 ? segments.slice(0, rootIndex + 1) : segments.slice(0, 1);

  const crumbs = rootSegments.map((segment, index) => ({
    label: titleCase(segment),
    href: `/${rootSegments.slice(0, index + 1).join("/")}`,
  }));

  const trailing = segments.slice(rootSegments.length);
  const idPattern = /^(stu|tch|stf|fam|inv|app|cls|thr|ast|sch)-/;
  trailing.forEach((segment, index) => {
    if (idPattern.test(segment)) return;
    crumbs.push({
      label: titleCase(segment),
      href: `/${[...rootSegments, ...trailing.slice(0, index + 1)].join("/")}`,
    });
  });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <Fragment key={`${crumb.href}-${index}`}>
            {index > 0 && <ChevronRight className="size-3" aria-hidden />}
            {last ? (
              <span className={cn("text-foreground font-medium")} aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}