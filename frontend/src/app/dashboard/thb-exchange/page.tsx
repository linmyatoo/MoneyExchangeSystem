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
  }, [page, search, txType]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">THB Exchange</h1>
        <div className="space-x-2">
          <Button onClick={() => setIsBuyFormOpen(true)} className="bg-green-600 hover:bg-green-700">
            <ArrowDownLeft className="mr-2 h-4 w-4" /> Buy THB
          </Button>
          <Button onClick={() => setIsSellFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Sell THB
          </Button>
        </div>
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">THB Inventory</h3>
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.total_remaining)} ฿
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total across Thai Banks</p>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Today's Buy</h3>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_buy)} ฿
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_buy_mmk)} Ks
            </p>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Today's Sell</h3>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_sell)} ฿
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(summary.today_sell_mmk)} Ks
            </p>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Today's Profit</h3>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(summary.today_profit)}
            </div>
            <p className="text-xs text-muted-foreground">Realized from sells</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search receipt or customer..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        <select
          className="flex h-10 w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
