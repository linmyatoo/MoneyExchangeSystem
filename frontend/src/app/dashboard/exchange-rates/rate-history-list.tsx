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
import { useLanguage } from "@/i18n/LanguageContext";

interface RateHistoryListProps {
  data: ExchangeRate[];
}

export function RateHistoryList({ data }: RateHistoryListProps) {
  const { t } = useLanguage();

  const columns: ColumnDef<ExchangeRate>[] = [
    {
      accessorKey: "status",
      header: t('common.status'),
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        if (isActive) {
          return (
            <div className="flex items-center text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t('common.active')}
            </div>
          );
        }
        return (
          <div className="flex items-center text-gray-500 font-medium">
            <Clock className="w-4 h-4 mr-1" />
            {t('common.inactive')}
          </div>
        );
      },
    },
    {
      accessorKey: "currency_code",
      header: t('common.currency'),
      cell: ({ row }) => row.getValue("currency_code"),
    },
    {
      accessorKey: "buy_rate",
      header: t('exchange_rates.buy_rate'),
      cell: ({ row }) => (
        <span className="font-medium text-blue-600">
          {row.getValue("buy_rate")}
        </span>
      ),
    },
    {
      accessorKey: "sell_rate",
      header: t('exchange_rates.sell_rate'),
      cell: ({ row }) => (
        <span className="font-medium text-purple-600">
          {row.getValue("sell_rate")}
        </span>
      ),
    },
    {
      accessorKey: "effective_date",
      header: t('exchange_rates.effective_date'),
      cell: ({ row }) => row.getValue("effective_date"),
    },
    {
      accessorKey: "created_at",
      header: t('common.created_at'),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "creator",
      header: t('audit_logs.user'),
      cell: ({ row }) => row.original.creator?.full_name || row.original.creator?.username || "-",
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
                  <TableCell key={cell.id} className="py-2 text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-medium text-base">{t('dashboard.no_data')}</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
