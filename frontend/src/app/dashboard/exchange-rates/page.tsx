"use client";

import { useEffect, useState } from "react";
import { Plus, LineChart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RateHistoryList } from "./rate-history-list";
import { RateForm } from "./rate-form";
import {
  ExchangeRate,
  getCurrentRate,
  getRateHistory,
  createExchangeRate,
} from "@/lib/api/exchange-rates";

export default function ExchangeRatesPage() {
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchRates();
  }, [page]);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        getCurrentRate("THB").catch(() => null), // If none exists
        getRateHistory({ page, page_size: 10, currency_code: "THB" }),
      ]);
      
      setCurrentRate(currentRes);
      setHistory(historyRes.items);
      setTotalPages(historyRes.total_pages);
    } catch (error) {
      console.error("Error fetching rates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    await createExchangeRate(data);
    fetchRates();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Exchange Rates</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Publish New Rate
        </Button>
      </div>
      
      {/* Current Rate Highlights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow border-blue-200">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Buy Rate</h3>
            <LineChart className="h-4 w-4 text-blue-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-blue-600">
              {currentRate ? currentRate.buy_rate : "Not Set"}
            </div>
            <p className="text-xs text-muted-foreground">THB per 100,000 MMK</p>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow border-purple-200">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Sell Rate</h3>
            <LineChart className="h-4 w-4 text-purple-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-purple-600">
              {currentRate ? currentRate.sell_rate : "Not Set"}
            </div>
            <p className="text-xs text-muted-foreground">THB per 100,000 MMK</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Rate History Log</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <RateHistoryList data={history} />
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

      <RateForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
