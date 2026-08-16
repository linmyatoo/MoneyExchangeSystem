"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, Calendar, User, Search, History, Banknote, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getCashHistory, CashOpeningResponse } from "@/lib/api/cash-management";

export default function CashHistoryPage() {
  const [data, setData] = useState<CashOpeningResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getCashHistory();
        setData(history);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        item.opening_date?.toLowerCase().includes(query) ||
        item.creator?.full_name?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const closedCount = useMemo(() => data.filter((d) => d.status === "closed").length, [data]);
  const openCount = useMemo(() => data.filter((d) => d.status !== "closed").length, [data]);

  const columns: ColumnDef<CashOpeningResponse>[] = [
    {
      accessorKey: "opening_date",
      header: "Opening Date",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-800">{row.getValue("opening_date")}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        if (status === "closed") {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Closed
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Open
          </span>
        );
      },
    },
    {
      accessorKey: "mmk_amount",
      header: "Opening MMK",
      cell: ({ row }) => (
        <div className="font-mono text-sm font-semibold text-slate-800">
          {new Intl.NumberFormat("en-US").format(row.getValue("mmk_amount") as number)}{" "}
          <span className="text-[11px] text-slate-400 font-normal">MMK</span>
        </div>
      ),
    },
    {
      accessorKey: "thb_amount",
      header: "Opening THB",
      cell: ({ row }) => (
        <div className="font-mono text-sm font-semibold text-purple-900">
          {new Intl.NumberFormat("en-US").format(row.getValue("thb_amount") as number)}{" "}
          <span className="text-[11px] text-purple-500 font-normal">THB</span>
        </div>
      ),
    },
    {
      accessorKey: "creator",
      header: "Opened By",
      cell: ({ row }) => {
        const creator = row.getValue("creator") as any;
        const name = creator?.full_name || "Unknown";
        return (
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700">{name}</span>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/cash-register">
              <Button variant="secondary" size="icon" className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-300" />
                <h1 className="text-2xl font-extrabold tracking-tight text-white">Shift History Log</h1>
              </div>
              <p className="text-slate-300 text-xs mt-1">Audit log of all physical cash drawer opening & closing records</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs">
              <span className="text-slate-300">Total Logs:</span> <strong className="text-white ml-1">{new Intl.NumberFormat("en-US").format(data.length)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Recorded Shifts</p>
          <p className="text-2xl font-extrabold text-slate-900">{new Intl.NumberFormat("en-US").format(data.length)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Reconciled & Closed</p>
          <p className="text-2xl font-extrabold text-emerald-700">{new Intl.NumberFormat("en-US").format(closedCount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Open Shifts</p>
          <p className="text-2xl font-extrabold text-amber-700">{new Intl.NumberFormat("en-US").format(openCount)}</p>
        </div>
      </div>

      {/* Search & Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-base text-slate-800 flex items-center">
            <Banknote className="w-5 h-5 text-indigo-600 mr-2" /> Shift Records
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search date, user, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-200">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-11 font-bold text-slate-600 uppercase text-[11px] tracking-wider">
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
                  <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-medium">Fetching shift log...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/60 transition-colors border-slate-100">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <ShieldCheck className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-sm font-semibold text-slate-700">No shift records found</span>
                      <span className="text-xs text-slate-400">Try adjusting your search criteria</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
