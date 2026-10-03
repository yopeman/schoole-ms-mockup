import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import type { NavGroup, NavItem } from "./nav-config";
import { canSeeItem } from "./nav-config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/auth/permissions";

type SidebarProps = {
  groups: NavGroup[];
  can: (permission: Permission) => boolean;
  onNavigate?: () => void;
  className?: string;
};

const isActive = (pathname: string, item: NavItem) =>
  pathname === item.href || pathname.startsWith(`${item.href}/`);

export function SidebarNav({ groups, can, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const visible = groups.filter((group) => group.items.some((item) => canSeeItem(item, can)));

  return (
    <nav className={cn("flex flex-col gap-6", className)}>
      {visible.map((group) => {
        const items = group.items.filter((item) => canSeeItem(item, can));
        if (items.length === 0) return null;

        return (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="text-muted-foreground/80 px-3 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </p>
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function SidebarHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Schoole MS</p>
        <p className="text-muted-foreground truncate text-xs">Management Portal</p>
      </div>
    </div>
  );
}