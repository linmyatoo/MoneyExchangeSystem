"use client";

import { useEffect, useState } from "react";
import { Plus, Search, ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExchangeList } from "./exchange-list";
import { BuyForm } from "./buy-form";
import { SellForm } from "./sell-form";
import {
  CurrencyExchange,
  THBInventorySummary,
  getExchangeHistory,
  getInventorySummary,
  buyTHB,
  sellTHB,
} from "@/lib/api/currency-exchange";
import { Customer, getCustomers } from "@/lib/api/customers";
import { WalletAccount, getWalletAccounts } from "@/lib/api/wallets";
import { ExchangeRate, getCurrentRate } from "@/lib/api/exchange-rates";

export default function THBExchangePage() {
  const [history, setHistory] = useState<CurrencyExchange[]>([]);
  const [summary, setSummary] = useState<THBInventorySummary>({
    total_remaining: 0,
    today_buy: 0,
    today_buy_mmk: 0,
    today_sell: 0,
    today_sell_mmk: 0,
    today_profit: 0,
    wallet_balances: [],
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mmkWallets, setMmkWallets] = useState<WalletAccount[]>([]);
  const [thbWallets, setThbWallets] = useState<WalletAccount[]>([]);
  
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState<string>("");
  const [period, setPeriod] = useState<string>("today");
  const [isLoading, setIsLoading] = useState(true);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);

  // Pagination & Form states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isBuyFormOpen, setIsBuyFormOpen] = useState(false);
  const [isSellFormOpen, setIsSellFormOpen] = useState(false);


  useEffect(() => {
    fetchPrerequisites();
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchSummary();
  }, [page, search, txType, period]);

  const fetchPrerequisites = async () => {
    try {
      const [custRes, walletRes, rateRes] = await Promise.all([
        getCustomers({ page_size: 100 }),
        getWalletAccounts({ page_size: 100 }),
        getCurrentRate("THB").catch(() => null),
      ]);
      setCustomers(custRes.items);
      setCurrentRate(rateRes);
      
      const THB_WALLET_TYPES = [
        "Thai Bank", "KBank", "BBL", "SCB", "KTB", "TTB", "CIMBT", "BAY", "LHBank", "KKP", "UOBT"
      ];
      const mmk = walletRes.items.filter(w => !THB_WALLET_TYPES.includes(w.wallet_type.name));
      const thb = walletRes.items.filter(w => THB_WALLET_TYPES.includes(w.wallet_type.name));
      setMmkWallets(mmk);
      setThbWallets(thb);
    } catch (error) {
      console.error("Error fetching prerequisites:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await getInventorySummary();
      setSummary(res);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await getExchangeHistory({
        page,
        page_size: 10,
        q: search,
        tx_type: txType || undefined,
        period: period || undefined,
      });
      setHistory(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (data: any) => {
    // If walkin, set customer_id to null
    if (data.customer_id === "walkin") {
      data.customer_id = null;
    }
    await buyTHB(data);
    fetchHistory();
    fetchSummary();
    fetchPrerequisites(); // Refresh wallet balances
  };

  const handleSell = async (data: any) => {
    // If walkin, set customer_id to null
    if (data.customer_id === "walkin") {
      data.customer_id = null;
    }
    await sellTHB(data);
    fetchHistory();
    fetchSummary();
    fetchPrerequisites(); // Refresh wallet balances
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">THB Exchange</h1>
          <p className="text-slate-500 font-medium text-[13px] mt-1.5">Manage THB buy and sell transactions.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsBuyFormOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all rounded-xl h-11 px-5 font-semibold text-sm">
            <ArrowDownLeft className="mr-2 h-4 w-4" /> Buy THB
          </Button>
          <Button onClick={() => setIsSellFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all rounded-xl h-11 px-5 font-semibold text-sm">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Sell THB
          </Button>
        </div>
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* THB Inventory */}
        <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 opacity-5">
            <Wallet className="h-24 w-24 -mr-4 -mt-4 text-purple-600" />
          </div>
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-purple-900/70 uppercase">THB Inventory</h3>
            <div className="p-1.5 bg-purple-100 rounded-full">
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-purple-600 tracking-tight">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.total_remaining)} ฿
            </div>
            <p className="text-xs text-purple-600/70 mt-1 font-medium">Total across Thai Banks</p>
          </div>
        </div>
        
        {/* Today's Buy */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 opacity-5">
            <ArrowDownLeft className="h-24 w-24 -mr-4 -mt-4 text-emerald-600" />
          </div>
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-emerald-900/70 uppercase">Today's Buy</h3>
            <div className="p-1.5 bg-emerald-100 rounded-full">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-emerald-600 tracking-tight">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_buy)} ฿
            </div>
            <p className="text-sm text-emerald-700/80 mt-1.5 font-semibold">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_buy_mmk)} Ks
            </p>
          </div>
        </div>
        
        {/* Today's Sell */}
        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 opacity-5">
            <ArrowUpRight className="h-24 w-24 -mr-4 -mt-4 text-blue-600" />
          </div>
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-blue-900/70 uppercase">Today's Sell</h3>
            <div className="p-1.5 bg-blue-100 rounded-full">
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-blue-600 tracking-tight">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_sell)} ฿
            </div>
            <p className="text-sm text-blue-700/80 mt-1.5 font-semibold">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_sell_mmk)} Ks
            </p>
          </div>
        </div>
        
        {/* Today's Profit */}
        <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 opacity-5">
            <TrendingUp className="h-24 w-24 -mr-4 -mt-4 text-amber-600" />
          </div>
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-amber-900/70 uppercase">Today's Profit</h3>
            <div className="p-1.5 bg-amber-100 rounded-full">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-amber-600 tracking-tight">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(summary.today_profit)}
            </div>
            <p className="text-xs text-amber-600/70 mt-1 font-medium">Realized from sells</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search receipt or customer..."
            className="pl-9 h-10 border-slate-200 text-sm focus:ring-blue-500 transition-all placeholder:text-slate-400"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        <select
          className="flex h-10 w-40 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_month">This Month</option>
        </select>
        
        <select
          className="flex h-10 w-40 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={txType}
          onChange={(e) => {
            setTxType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Types</option>
          <option value="buy">Buys Only</option>
          <option value="sell">Sells Only</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <ExchangeList data={history} />
      )}

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center space-x-2 pt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <div className="flex items-center px-4 font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <BuyForm
        open={isBuyFormOpen}
        onOpenChange={setIsBuyFormOpen}
        customers={customers}
        mmkWallets={mmkWallets}
        thbWallets={thbWallets}
        currentRate={currentRate}
        onSubmit={handleBuy}
      />
      
      <SellForm
        open={isSellFormOpen}
        onOpenChange={setIsSellFormOpen}
        customers={customers}
        mmkWallets={mmkWallets}
        thbWallets={thbWallets}
        currentRate={currentRate}
        onSubmit={handleSell}
      />
    </div>
  );
}
