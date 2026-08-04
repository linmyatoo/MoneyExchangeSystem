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
            <div className="flex items-center text-green-600 font-medium">
              <ArrowDownLeft className="w-4 h-4 mr-1" />
              BUY THB
            </div>
          );
        }
        return (
          <div className="flex items-center text-blue-600 font-medium">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            SELL THB
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
          <span className={`font-medium ${profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-gray-600"}`}>
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
                No transactions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
