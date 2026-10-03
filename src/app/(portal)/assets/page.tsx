"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import type { Asset } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTable } from "@/hooks/use-data-table";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { TODAY, dateLabel, money } from "@/lib/mock/constants";

const CATEGORIES: Asset["category"][] = ["furniture", "electronics", "sports", "lab", "vehicle", "other"];

export default function AssetsPage() {
  const lookups = useLookups();
  const { can } = useSession();
  const table = useDataTable<Asset>("assets", { initialSort: "name" });
  const [creating, setCreating] = useState(false);

  const canManage = can("assets.manage");

  const all = useMemo(() => db.all<Asset>("assets"), []);
  const locations = useMemo(() => [...new Set(all.map((a) => a.location))].sort(), [all]);
  const totalValue = all.reduce((sum, a) => sum + a.purchaseValue, 0);
  const needsRepair = all.filter((a) => a.condition === "needs_repair" || a.condition === "damaged");

  const columns: Column<Asset>[] = [
    {
      key: "name",
      header: "Asset",
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
      cell: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.category}
        </Badge>
      ),
    },
    { key: "location", header: "Location", sortable: true },
    { key: "purchaseDate", header: "Acquired", secondary: true, sortable: true, cell: (row) => dateLabel(row.purchaseDate) },
    { key: "purchaseValue", header: "Value", align: "right", sortable: true, cell: (row) => money(row.purchaseValue) },
    { key: "condition", header: "Condition", sortable: true, cell: (row) => <StatusBadge value={row.condition} map={STATUS_MAPS.asset} /> },
  ];

  const markRepair = async (asset: Asset, condition: Asset["condition"]) => {
    await db.update<Asset>("assets", asset.id, { condition });
    toast.success(`${asset.name} marked as ${condition.replace("_", " ")}`);
    table.refresh();
  };

  return (
    <>
      <PageHeader
        title="Asset Register"
        description={`${all.length} tracked assets across campus`}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Add asset
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Assets" value={all.length} icon={Building2} tone="info" />
        <StatCard label="Replacement Value" value={money(totalValue)} />
        <StatCard label="Needs Attention" value={needsRepair.length} icon={Wrench} tone={needsRepair.length ? "warning" : "positive"} />
        <StatCard label="Locations" value={locations.length} />
      </div>

      {needsRepair.length > 0 && (
        <section className="bg-card mb-6 rounded-xl border p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Wrench className="size-4 text-amber-500" />
            Maintenance queue
          </h2>
          <ul className="space-y-2">
            {needsRepair.map((asset) => (
              <li key={asset.id} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {asset.code} · {asset.location}
                  </p>
                </div>
                <StatusBadge value={asset.condition} map={STATUS_MAPS.asset} />
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => markRepair(asset, "needs_repair")}>
                      Needs repair
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => markRepair(asset, "good")}>
                      Resolved
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <DataTable
        rows={table.data}
        columns={columns}
        rowKey={(row) => row.id}
        loading={table.loading}
        error={table.error}
        search={{ value: table.state.search, onChange: table.setSearch, placeholder: "Search assets..." }}
        filters={[
          { key: "category", label: "category", options: CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })) },
          { key: "condition", label: "condition", options: Object.entries(STATUS_MAPS.asset).map(([value, meta]) => ({ value, label: meta.label })) },
          { key: "location", label: "location", options: locations.map((l) => ({ value: l, label: l })) },
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
        exportName={`assets-${TODAY}`}
        empty={{ title: "No assets found" }}
      />

      <p className="text-muted-foreground mt-6 text-xs">
        {lookups.classes.length} classes and {lookups.sections.length} sections reference rooms in this register.
      </p>

      <AssetDialog open={creating} locations={locations} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); table.refresh(); }} />
    </>
  );
}

const AssetDialog = ({
  open,
  locations,
  onClose,
  onSaved,
}: {
  open: boolean;
  locations: string[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<Asset["category"]>("furniture");
  const [location, setLocation] = useState(locations[0] ?? "");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Asset name and code are required");
      return;
    }

    setPending(true);
    await db.create<Asset>("assets", {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      category,
      location,
      purchaseDate: TODAY,
      purchaseValue: Number(value) || 0,
      condition: "new",
    } as never);

    setPending(false);
    setName("");
    setCode("");
    setValue("");
    toast.success("Asset added to the register");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add asset</DialogTitle>
          <DialogDescription>Register a new item for tracking and depreciation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Asset code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AST-1042" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Asset["category"])}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Purchase value</Label>
              <Input id="value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} list="asset-locations" />
            <datalist id="asset-locations">
              {locations.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Adding..." : "Add asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};