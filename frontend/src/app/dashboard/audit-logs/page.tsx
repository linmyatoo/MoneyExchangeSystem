"use client";

import { useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";

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
    
    // Add a slight debounce for search
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [page, search]);

  const columns: ColumnDef<AuditLogResponse>[] = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {row.getValue("action")}
        </span>
      ),
    },
    {
      accessorKey: "entity_type",
      header: "Entity",
      cell: ({ row }) => row.getValue("entity_type"),
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.getValue("user") as any;
        return user ? user.full_name : "System";
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }) => row.getValue("ip_address") || "N/A",
    },
    {
      id: "actions",
      header: "Details",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedLog(row.original)}>
          View Diff
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, entity, user..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset to page 1 on search
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
                  Loading audit trail...
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
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total {data?.total || 0} records
        </p>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || data.items.length < pageSize}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Record Details</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="font-semibold text-gray-500 block">Action</span>
                  <span>{selectedLog.action}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Entity</span>
                  <span>{selectedLog.entity_type} ({selectedLog.entity_id})</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">User</span>
                  <span>{selectedLog.user?.full_name || 'System'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Timestamp</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-4 bg-red-50">
                  <h4 className="font-semibold text-red-800 mb-2">Old Values</h4>
                  <pre className="text-xs overflow-x-auto text-red-900">
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : "None (Creation/No Data)"}
                  </pre>
                </div>
                <div className="border rounded-md p-4 bg-green-50">
                  <h4 className="font-semibold text-green-800 mb-2">New Values</h4>
                  <pre className="text-xs overflow-x-auto text-green-900">
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : "None (Deletion/No Data)"}
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
