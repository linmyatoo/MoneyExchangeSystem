"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Download, FileText, Table as TableIcon, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getProfitReport,
  getWalletBalancesReport,
  getCashFlowReport,
  ProfitReportResponse,
  WalletBalanceReportResponse,
  CashFlowReportResponse,
} from "@/lib/api/reports";

import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [profitData, setProfitData] = useState<ProfitReportResponse | null>(null);
  const [walletData, setWalletData] = useState<WalletBalanceReportResponse | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowReportResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [profit, wallets, cashFlow] = await Promise.all([
        getProfitReport(startDate, endDate),
        getWalletBalancesReport(),
        getCashFlowReport(startDate, endDate),
      ]);
      setProfitData(profit);
      setWalletData(wallets);
      setCashFlowData(cashFlow);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExport = (type: "csv" | "excel" | "pdf", reportType: string) => {
    let filename = "";
    let title = "";
    let headers: string[] = [];
    let data: any[][] = [];

    if (reportType === "profit" && profitData) {
      filename = `Profit_Report_${startDate}_${endDate}`;
      title = `Profit Report (${startDate} to ${endDate})`;
      headers = ["Date", "Exchange Profit", "Transaction Profit", "Total Profit"];
      data = profitData.items.map(item => [
        item.date,
        item.exchange_profit,
        item.transaction_profit,
        item.total_profit
      ]);
      data.push(["TOTALS", profitData.total_exchange_profit, profitData.total_transaction_profit, profitData.overall_profit]);
    } 
    else if (reportType === "wallets" && walletData) {
      filename = `Wallet_Balances_${format(new Date(), "yyyy-MM-dd")}`;
      title = `Wallet Balances (As of ${format(new Date(), "yyyy-MM-dd")})`;
      headers = ["Wallet Name", "Type", "Current Balance"];
      data = walletData.items.map(item => [
        item.wallet_name,
        item.wallet_type,
        item.current_balance
      ]);
    }
    else if (reportType === "cashflow" && cashFlowData) {
      filename = `Cash_Flow_Report_${startDate}_${endDate}`;
      title = `Cash Flow Report (${startDate} to ${endDate})`;
      headers = ["Date", "Inflow", "Outflow", "Net Flow"];
      data = cashFlowData.items.map(item => [
        item.date,
        item.inflow,
        item.outflow,
        item.net_flow
      ]);
      data.push(["TOTALS", cashFlowData.total_inflow, cashFlowData.total_outflow, cashFlowData.overall_net]);
    }

    if (type === "csv") exportToCSV(filename, headers, data);
    if (type === "excel") exportToExcel(filename, headers, data);
    if (type === "pdf") exportToPDF(filename, title, headers, data);
  };

  const renderExportButtons = (reportType: string) => (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={() => handleExport("csv", reportType)}>
        <FileText className="w-4 h-4 mr-2" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("excel", reportType)}>
        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("pdf", reportType)}>
        <Download className="w-4 h-4 mr-2 text-red-600" /> PDF
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('reports.title')}</h1>
          <p className="text-muted-foreground text-xs mt-1">{t('reports.desc')}</p>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('reports.start_date')}</Label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all text-sm"
          />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('reports.end_date')}</Label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all text-sm"
          />
        </div>
        <div className="w-full sm:w-auto pt-2 sm:pt-0">
          <Button onClick={fetchReports} disabled={isLoading} className="w-full sm:w-auto h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium transition-colors">
            {isLoading ? t('common.loading') : t('common.filter')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profit" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profit">{t('dashboard.today_profit')}</TabsTrigger>
          <TabsTrigger value="cashflow">{t('nav.transactions')}</TabsTrigger>
          <TabsTrigger value="wallets">{t('wallets.title')}</TabsTrigger>
        </TabsList>

        {/* Profit Report Tab */}
        <TabsContent value="profit" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{t('reports.summary')}</h2>
            {renderExportButtons("profit")}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">{t('common.date')}</TableHead>
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">{t('dashboard.exchange_profit')}</TableHead>
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">{t('dashboard.transactions_profit')}</TableHead>
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider text-right">{t('reports.total_profit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitData?.items.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-2.5 text-sm font-medium text-slate-700">{row.date}</TableCell>
                    <TableCell className="py-2.5 text-sm text-slate-600">{new Intl.NumberFormat("en-US").format(row.exchange_profit)}</TableCell>
                    <TableCell className="py-2.5 text-sm text-slate-600">{new Intl.NumberFormat("en-US").format(row.transaction_profit)}</TableCell>
                    <TableCell className="py-2.5 text-right text-sm font-bold text-emerald-600">
                      {new Intl.NumberFormat("en-US").format(row.total_profit)} K
                    </TableCell>
                  </TableRow>
                ))}
                {profitData?.items.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500 text-sm">{t('dashboard.no_data')}</TableCell></TableRow>
                )}
                {profitData && profitData.items.length > 0 && (
                  <TableRow className="bg-slate-50 border-t border-slate-200 hover:bg-slate-50">
                    <TableCell className="py-3 font-extrabold text-slate-800 uppercase tracking-wider text-xs">{t('common.total')}</TableCell>
                    <TableCell className="py-3 font-bold text-slate-700">{new Intl.NumberFormat("en-US").format(profitData.total_exchange_profit)}</TableCell>
                    <TableCell className="py-3 font-bold text-slate-700">{new Intl.NumberFormat("en-US").format(profitData.total_transaction_profit)}</TableCell>
                    <TableCell className="py-3 text-right font-extrabold text-emerald-700 text-base">
                      {new Intl.NumberFormat("en-US").format(profitData.overall_profit)} K
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{t('nav.transactions')}</h2>
            {renderExportButtons("cashflow")}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">{t('common.date')}</TableHead>
                  <TableHead className="h-10 font-semibold text-emerald-600 uppercase text-[11px] tracking-wider">{t('transactions.deposit')}</TableHead>
                  <TableHead className="h-10 font-semibold text-orange-600 uppercase text-[11px] tracking-wider">{t('transactions.withdraw')}</TableHead>
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider text-right">{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlowData?.items.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-2.5 text-sm font-medium text-slate-700">{row.date}</TableCell>
                    <TableCell className="py-2.5 text-sm text-emerald-600 font-medium">{new Intl.NumberFormat("en-US").format(row.inflow)}</TableCell>
                    <TableCell className="py-2.5 text-sm text-orange-600 font-medium">{new Intl.NumberFormat("en-US").format(row.outflow)}</TableCell>
                    <TableCell className={`py-2.5 text-right text-sm font-bold ${row.net_flow >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {new Intl.NumberFormat("en-US").format(row.net_flow)}
                    </TableCell>
                  </TableRow>
                ))}
                {cashFlowData?.items.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500 text-sm">{t('dashboard.no_data')}</TableCell></TableRow>
                )}
                {cashFlowData && cashFlowData.items.length > 0 && (
                  <TableRow className="bg-slate-50 border-t border-slate-200 hover:bg-slate-50">
                    <TableCell className="py-3 font-extrabold text-slate-800 uppercase tracking-wider text-xs">{t('common.total')}</TableCell>
                    <TableCell className="py-3 font-bold text-emerald-600">{new Intl.NumberFormat("en-US").format(cashFlowData.total_inflow)}</TableCell>
                    <TableCell className="py-3 font-bold text-orange-600">{new Intl.NumberFormat("en-US").format(cashFlowData.total_outflow)}</TableCell>
                    <TableCell className={`py-3 text-right font-extrabold text-base ${cashFlowData.overall_net >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                      {new Intl.NumberFormat("en-US").format(cashFlowData.overall_net)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Wallet Balances Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{t('wallets.title')}</h2>
            {renderExportButtons("wallets")}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">{t('wallets.wallet_name')}</TableHead>
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">{t('wallets.type')}</TableHead>
                  <TableHead className="h-10 font-semibold text-slate-600 uppercase text-[11px] tracking-wider text-right">{t('wallets.current_balance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {walletData?.items.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-2.5 font-bold text-sm text-slate-800">{row.wallet_name}</TableCell>
                    <TableCell className="py-2.5 text-sm text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                        {row.wallet_type}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-bold text-blue-600 text-sm">
                      {new Intl.NumberFormat("en-US").format(row.current_balance)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!walletData || walletData.items.length === 0) && (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-500 text-sm">{t('dashboard.no_data')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
