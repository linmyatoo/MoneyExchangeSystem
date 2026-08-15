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
import { useLanguage } from "@/i18n/LanguageContext";

interface WalletListProps {
  data: WalletAccount[];
  onEdit: (wallet: WalletAccount) => void;
  onToggleStatus: (wallet: WalletAccount) => void;
  currency?: "MMK" | "THB";
}

export function WalletList({ data, onEdit, onToggleStatus, currency = "MMK" }: WalletListProps) {
  const { t } = useLanguage();

  const columns: ColumnDef<WalletAccount>[] = [
    {
      accessorKey: "account_name",
      header: t('wallets.account_name'),
    },
    {
      accessorKey: "wallet_type.name",
      header: t('wallets.type'),
    },
    {
      accessorKey: "account_number",
      header: t('wallets.account_number'),
      cell: ({ row }) => row.original.account_number || "-",
    },
    {
      accessorKey: "balance",
      header: t('wallets.current_balance'),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("balance"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
          minimumFractionDigits: 0,
        }).format(amount);
        
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "is_active",
      header: t('wallets.status'),
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {isActive ? t('common.active') : t('common.inactive')}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: t('wallets.actions'),
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(wallet)}
            >
              <Edit2 className="w-4 h-4 mr-1" /> {t('common.edit')}
            </Button>
            <Button
              variant={wallet.is_active ? "destructive" : "default"}
              size="sm"
              onClick={() => onToggleStatus(wallet)}
            >
              {wallet.is_active ? (
                <><Ban className="w-4 h-4 mr-1" /> {t('common.deactivate')}</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-1" /> {t('common.activate')}</>
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
    <div className="w-full">
      <Table>
        <TableHeader className="bg-slate-50/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-100 border-b">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className="h-10 font-semibold text-slate-500 uppercase text-[11px] tracking-wider">
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
                className="hover:bg-slate-50/50 transition-colors border-slate-100"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3 text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-medium text-base">{t('wallets.no_wallets')}</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
