"use client";

import { useEffect, useState } from "react";
import { Search, DollarSign } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { CreditList } from "./credit-list";
import {
  WalletTransaction,
  getWalletTransactions,
  updateWalletTransaction,
} from "@/lib/api/wallet-transactions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function CreditsPage() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard Metrics
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  const [settleTarget, setSettleTarget] = useState<WalletTransaction | null>(null);

  useEffect(() => {
    fetchCredits();
  }, [search]);

  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      const response = await getWalletTransactions({
        is_credit: true,
        page_size: 100,
        q: search || undefined,
      });
      
      setTransactions(response.items);
      
      let outstanding = 0;
      response.items.forEach(tx => {
        outstanding += parseFloat(tx.amount.toString());
      });
      setTotalOutstanding(outstanding);

    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!settleTarget) return;
    try {
      const updateData = {
        amount: parseFloat(settleTarget.amount.toString()),
        profit: parseFloat((settleTarget.profit || 0).toString()),
        is_credit: false,
        customer_id: settleTarget.customer_id,
        customer_name: settleTarget.customer?.name || (settleTarget.notes?.startsWith("Customer: ") ? settleTarget.notes.split(" | ")[0].replace("Customer: ", "") : null),
        from_wallet_account_id: settleTarget.from_wallet_account_id,
        to_wallet_account_id: settleTarget.to_wallet_account_id,
        profit_wallet_account_id: null,
        notes: settleTarget.notes,
      };

      await updateWalletTransaction(settleTarget.id, updateData);
      fetchCredits();
    } catch (error) {
      console.error("Failed to settle credit", error);
      alert("Failed to update transaction.");
    } finally {
      setSettleTarget(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{t('credits.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('credits.desc')}</p>
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white shadow-sm transition-all hover:shadow-md">
          <div className="p-5 flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-red-900/70 uppercase">{t('dashboard.total_outstanding')}</h3>
            <div className="p-1.5 bg-red-100 rounded-full">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold text-red-600 tracking-tight">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(totalOutstanding)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('credits.search_placeholder')}
            className="pl-9 h-10 rounded-lg bg-white shadow-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-shadow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <CreditList 
          data={transactions} 
          onMarkSettled={setSettleTarget}
        />
      )}

      {/* Settle Confirmation Dialog */}
      <Dialog open={!!settleTarget} onOpenChange={(open) => !open && setSettleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('credits.repay_credit')}</DialogTitle>
            <DialogDescription>
              {settleTarget?.transaction_number}
            </DialogDescription>
          </DialogHeader>
          
          {settleTarget && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-md flex justify-between items-center">
                <span className="font-medium">{t('credits.repay_amount')}:</span>
                <span className="text-xl font-bold text-red-600">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(
                    parseFloat(settleTarget.amount.toString())
                  )}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleTarget(null)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSettle}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
