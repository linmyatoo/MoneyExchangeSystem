"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Download, FileText, Table as TableIcon, FileSpreadsheet } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">System Reports</h1>
      </div>

      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
        <div className="space-y-1">
          <Label>Start Date</Label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>
        <div className="space-y-1">
          <Label>End Date</Label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>
        <div className="pt-5">
          <Button onClick={fetchReports} disabled={isLoading}>
            {isLoading ? "Generating..." : "Apply Filters"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profit" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profit">Profit Report</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="wallets">Wallet Balances</TabsTrigger>
        </TabsList>

        {/* Profit Report Tab */}
        <TabsContent value="profit" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Daily Profit Breakdown</h2>
            {renderExportButtons("profit")}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Exchange Profit</TableHead>
                  <TableHead>Transaction Profit</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitData?.items.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-US").format(row.exchange_profit)}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-US").format(row.transaction_profit)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {new Intl.NumberFormat("en-US").format(row.total_profit)} K
                    </TableCell>
                  </TableRow>
                ))}
                {profitData?.items.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center">No data found</TableCell></TableRow>
                )}
                {profitData && profitData.items.length > 0 && (
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTALS</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-US").format(profitData.total_exchange_profit)}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-US").format(profitData.total_transaction_profit)}</TableCell>
                    <TableCell className="text-right text-green-700">
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Daily Cash Flow</h2>
            {renderExportButtons("cashflow")}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-green-600">Inflow</TableHead>
                  <TableHead className="text-red-600">Outflow</TableHead>
                  <TableHead className="text-right">Net Flow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlowData?.items.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="text-green-600">{new Intl.NumberFormat("en-US").format(row.inflow)}</TableCell>
                    <TableCell className="text-red-600">{new Intl.NumberFormat("en-US").format(row.outflow)}</TableCell>
                    <TableCell className={`text-right font-medium ${row.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {new Intl.NumberFormat("en-US").format(row.net_flow)}
                    </TableCell>
                  </TableRow>
                ))}
                {cashFlowData?.items.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center">No data found</TableCell></TableRow>
                )}
                {cashFlowData && cashFlowData.items.length > 0 && (
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTALS</TableCell>
                    <TableCell className="text-green-600">{new Intl.NumberFormat("en-US").format(cashFlowData.total_inflow)}</TableCell>
                    <TableCell className="text-red-600">{new Intl.NumberFormat("en-US").format(cashFlowData.total_outflow)}</TableCell>
                    <TableCell className={`text-right ${cashFlowData.overall_net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Current Wallet Snapshot</h2>
            {renderExportButtons("wallets")}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {walletData?.items.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.wallet_name}</TableCell>
                    <TableCell>{row.wallet_type}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {new Intl.NumberFormat("en-US").format(row.current_balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
