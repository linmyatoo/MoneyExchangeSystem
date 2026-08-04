"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { WalletAccount } from "@/lib/api/wallets";
import { Edit2, Ban, CheckCircle } from "lucide-react";

interface WalletListProps {
  data: WalletAccount[];
  onEdit: (wallet: WalletAccount) => void;
  onToggleStatus: (wallet: WalletAccount) => void;
  currency?: "MMK" | "THB";
}

export function WalletList({ data, onEdit, onToggleStatus, currency = "MMK" }: WalletListProps) {
  const columns: ColumnDef<WalletAccount>[] = [
    {
      accessorKey: "account_name",
      header: "Account Name",
    },
    {
      accessorKey: "wallet_type.name",
      header: "Type",
    },
    {
      accessorKey: "account_number",
      header: "Account Number",
      cell: ({ row }) => row.original.account_number || "-",
    },
    {
      accessorKey: "balance",
      header: "Current Balance",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("balance"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
          minimumFractionDigits: 0,
        }).format(amount);
        
        // For THB, append "Baht" instead of default formatting if desired, 
        // but Intl.NumberFormat with currency="THB" already handles THB symbol.
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(wallet)}
            >
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button
              variant={wallet.is_active ? "destructive" : "default"}
              size="sm"
              onClick={() => onToggleStatus(wallet)}
            >
              {wallet.is_active ? (
                <><Ban className="w-4 h-4 mr-1" /> Deactivate</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-1" /> Activate</>
              )}
            </Button>
          </div>
        );
      },
    },
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
                No wallet accounts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
