"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircle2, Clock } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExchangeRate } from "@/lib/api/exchange-rates";

interface RateHistoryListProps {
  data: ExchangeRate[];
}

export function RateHistoryList({ data }: RateHistoryListProps) {
  const columns: ColumnDef<ExchangeRate>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        if (isActive) {
          return (
            <div className="flex items-center text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Active
            </div>
          );
        }
        return (
          <div className="flex items-center text-gray-500 font-medium">
            <Clock className="w-4 h-4 mr-1" />
            Historical
          </div>
        );
      },
    },
    {
      accessorKey: "currency_code",
      header: "Currency",
      cell: ({ row }) => row.getValue("currency_code"),
    },
    {
      accessorKey: "buy_rate",
      header: "Buy Rate",
      cell: ({ row }) => (
        <span className="font-medium text-blue-600">
          {row.getValue("buy_rate")}
        </span>
      ),
    },
    {
      accessorKey: "sell_rate",
      header: "Sell Rate",
      cell: ({ row }) => (
        <span className="font-medium text-purple-600">
          {row.getValue("sell_rate")}
        </span>
      ),
    },
    {
      accessorKey: "effective_date",
      header: "Effective Date",
      cell: ({ row }) => row.getValue("effective_date"),
    },
    {
      accessorKey: "created_at",
      header: "Published On",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "creator",
      header: "Published By",
      cell: ({ row }) => row.original.creator?.full_name || row.original.creator?.username || "Unknown",
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
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
                No rates found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
