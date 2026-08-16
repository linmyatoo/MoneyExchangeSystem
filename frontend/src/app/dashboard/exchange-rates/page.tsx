"use client";

import { useEffect, useState } from "react";
import { Plus, LineChart } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

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
  const { t } = useLanguage();
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
        getCurrentRate("THB").catch(() => null),
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('exchange_rates.title')}</h1>
          <p className="text-muted-foreground text-xs mt-1">{t('exchange_rates.desc')}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all rounded-md h-10 px-4 font-medium">
          <Plus className="mr-2 h-4 w-4" /> {t('exchange_rates.update_rate')}
        </Button>
      </div>
      
      {/* Current Rate Highlights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-blue-900/70 uppercase">{t('dashboard.active_buy_rate')}</h3>
            <div className="p-1.5 bg-blue-100 rounded-full">
              <LineChart className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-blue-600 tracking-tight">
              {currentRate ? new Intl.NumberFormat("en-US").format(currentRate.buy_rate) : "-"}
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-purple-900/70 uppercase">{t('dashboard.active_sell_rate')}</h3>
            <div className="p-1.5 bg-purple-100 rounded-full">
              <LineChart className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-purple-600 tracking-tight">
              {currentRate ? new Intl.NumberFormat("en-US").format(currentRate.sell_rate) : "-"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('exchange_rates.rate_history')}</h2>
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
            {t('common.previous')}
          </Button>
          <div className="flex items-center px-4 font-medium">
            {t('common.page_of', { page, total: totalPages })}
          </div>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('common.next')}
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
