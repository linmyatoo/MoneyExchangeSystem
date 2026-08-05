"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowRight, ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WalletTransaction } from "@/lib/api/wallet-transactions";
import { Button } from "@/components/ui/button";

interface TransactionListProps {
  data: WalletTransaction[];
  onEdit?: (tx: WalletTransaction) => void;
  onDelete?: (tx: WalletTransaction) => void;
}

export function TransactionList({ data, onEdit, onDelete }: TransactionListProps) {
  const columns: ColumnDef<WalletTransaction>[] = [
    {
      accessorKey: "transaction_number",
      header: "Receipt #",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.transaction_number}</span>
    },
    {
      accessorKey: "transaction_date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.transaction_date).toLocaleString(),
    },
    {
      id: "wallet_name",
      header: "Wallet",
      cell: ({ row }) => {
        const tx = row.original;
        const from = tx.from_wallet_account?.account_name;
        const to = tx.to_wallet_account?.account_name;

        if (from && to) return `${from} / ${to}`;
        if (from) return from;
        if (to) return to;
        return "-";
      }
    },
    {
      id: "type_flow",
      header: "Flow",
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.transaction_type === "deposit") {
          return (
            <div className="flex items-center text-green-600">
              <ArrowDownRight className="w-4 h-4 mr-1" />
              <span>Deposit</span>
            </div>
          );
        } else if (tx.transaction_type === "withdrawal") {
          return (
            <div className="flex items-center text-red-600">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>Withdrawal</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center text-blue-600">
              <ArrowRight className="w-4 h-4 mr-1" />
              <span>Transfer</span>
            </div>
          );
        }
      }
    },
    {
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.customer?.name) return tx.customer.name;
        // Extract from notes if stored as "Customer: Name | ..."
        if (tx.notes?.startsWith("Customer: ")) {
          const name = tx.notes.split(" | ")[0].replace("Customer: ", "");
          return name;
        }
        return "-";
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "MMK",
          minimumFractionDigits: 0,
        }).format(amount);
        const isCredit = row.original.is_credit;
        return <div className={`font-medium ${isCredit ? 'text-red-600' : ''}`}>{formatted}</div>;
      },
    },
    {
      accessorKey: "profit",
      header: "Profit",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("profit"));
        if (amount === 0) return "-";
        return <span className="text-green-600">{new Intl.NumberFormat("en-US", { currency: "MMK", style: "currency", minimumFractionDigits: 0 }).format(amount)}</span>;
      },
    },
    {
      accessorKey: "is_credit",
      header: "Credit",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.is_credit ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
          {row.original.is_credit ? "Yes" : "No"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit?.(row.original)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete?.(row.original)} title="Delete" className="text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
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
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                );
              })}
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
