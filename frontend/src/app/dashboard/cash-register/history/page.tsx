"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
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

  const columns: ColumnDef<CashOpeningResponse>[] = [
    {
      accessorKey: "opening_date",
      header: "Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        if (status === "closed") {
          return <span className="flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-1"/> Closed</span>;
        }
        return <span className="flex items-center text-orange-500"><AlertCircle className="w-4 h-4 mr-1"/> Open</span>;
      }
    },
    {
      accessorKey: "mmk_amount",
      header: "Opening MMK",
      cell: ({ row }) => new Intl.NumberFormat("en-US").format(row.getValue("mmk_amount") as number)
    },
    {
      accessorKey: "thb_amount",
      header: "Opening THB",
      cell: ({ row }) => new Intl.NumberFormat("en-US").format(row.getValue("thb_amount") as number)
    },
    {
      accessorKey: "creator",
      header: "Opened By",
      cell: ({ row }) => (row.getValue("creator") as any).full_name
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/cash-register">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Shift History Log</h1>
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
                  Loading history...
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
                  No shift records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
