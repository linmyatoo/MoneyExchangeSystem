"use client";

import { useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getAuditLogs, AuditLogResponse, AuditLogListResponse } from "@/lib/api/audit-logs";

export default function AuditLogsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);
  
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const result = await getAuditLogs({ skip: (page - 1) * pageSize, limit: pageSize, search: search || undefined });
        setData(result);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [page, search]);

  const columns: ColumnDef<AuditLogResponse>[] = [
    {
      accessorKey: "created_at",
      header: t('common.created_at'),
      cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
    },
    {
      accessorKey: "action",
      header: t('audit_logs.action'),
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {row.getValue("action")}
        </span>
      ),
    },
    {
      accessorKey: "entity_type",
      header: t('audit_logs.entity'),
      cell: ({ row }) => row.getValue("entity_type"),
    },
    {
      accessorKey: "user",
      header: t('audit_logs.user'),
      cell: ({ row }) => {
        const user = row.getValue("user") as any;
        return user ? user.full_name : "System";
      },
    },
    {
      accessorKey: "ip_address",
      header: t('audit_logs.ip_address'),
      cell: ({ row }) => row.getValue("ip_address") || "N/A",
    },
    {
      id: "actions",
      header: t('common.actions'),
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedLog(row.original)}>
          {t('common.details')}
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('audit_logs.title')}</h1>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('credits.search_placeholder')}
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('dashboard.no_data')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total || 0}
        </p>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || data.items.length < pageSize}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('audit_logs.details')}</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="font-semibold text-gray-500 block">{t('audit_logs.action')}</span>
                  <span>{selectedLog.action}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">{t('audit_logs.entity')}</span>
                  <span>{selectedLog.entity_type} ({selectedLog.entity_id})</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">{t('audit_logs.user')}</span>
                  <span>{selectedLog.user?.full_name || 'System'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">{t('common.created_at')}</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-4 bg-red-50">
                  <h4 className="font-semibold text-red-800 mb-2">{t('audit_logs.old_values')}</h4>
                  <pre className="text-xs overflow-x-auto text-red-900">
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : "None"}
                  </pre>
                </div>
                <div className="border rounded-md p-4 bg-green-50">
                  <h4 className="font-semibold text-green-800 mb-2">{t('audit_logs.new_values')}</h4>
                  <pre className="text-xs overflow-x-auto text-green-900">
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : "None"}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
