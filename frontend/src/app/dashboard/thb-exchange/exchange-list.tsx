"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyExchange } from "@/lib/api/currency-exchange";

interface ExchangeListProps {
  data: CurrencyExchange[];
}

export function ExchangeList({ data }: ExchangeListProps) {
  const columns: ColumnDef<CurrencyExchange>[] = [
    {
      accessorKey: "transaction_number",
      header: "Receipt #",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("transaction_number")}</span>
      ),
    },
    {
      accessorKey: "transaction_date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.transaction_date).toLocaleString(),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        if (type === "buy") {
          return (
            <div className="flex items-center text-emerald-600 font-semibold text-xs">
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
              BUY
            </div>
          );
        }
        return (
          <div className="flex items-center text-blue-600 font-semibold text-xs">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            SELL
          </div>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => row.original.customer?.name || row.original.customer_name || "Walk-in",
    },
    {
      accessorKey: "thb_wallet_name",
      header: "THB Wallet",
      cell: ({ row }) => row.getValue("thb_wallet_name") || "-",
    },
    {
      accessorKey: "foreign_amount",
      header: "THB Amount",
      cell: ({ row }) => (
        <span className="font-bold">
          {new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(row.getValue("foreign_amount"))} ฿
        </span>
      ),
    },
    {
      accessorKey: "rate_used",
      header: "Rate",
      cell: ({ row }) => row.getValue("rate_used"),
    },
    {
      accessorKey: "local_amount",
      header: "MMK Amount",
      cell: ({ row }) => (
        <span className="font-medium text-gray-700">
          {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(row.getValue("local_amount"))} K
        </span>
      ),
    },
    {
      accessorKey: "profit",
      header: "Profit (MMK)",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        if (type === "buy") return <span className="text-gray-400">-</span>;
        
        const profit = row.getValue("profit") as number;
        return (
          <span className={`font-semibold ${profit > 0 ? "text-emerald-600" : profit < 0 ? "text-rose-600" : "text-slate-500"}`}>
            {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(profit)}
          </span>
        );
      },
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-200">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
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
                className="hover:bg-slate-50/50 transition-colors border-slate-100"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5 text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-medium text-base">No transactions found.</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
