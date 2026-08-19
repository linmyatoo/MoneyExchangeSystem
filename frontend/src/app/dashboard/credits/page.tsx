"use client";

import { useEffect, useState } from "react";
import { Search, DollarSign, Plus, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { CreditList } from "./credit-list";
import {
  WalletTransaction,
  createWalletTransaction,
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
  const [isSettling, setIsSettling] = useState(false);

  // Manually created credit
  const [createOpen, setCreateOpen] = useState(false);
  const [creditName, setCreditName] = useState("");
  const [creditAmount, setCreditAmount] = useState<number | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Credits added from this page are a record only: neither creating nor
  // repaying them touches a wallet balance.
  const isManualCredit = settleTarget?.transaction_type === "credit";

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

  const openSettle = (tx: WalletTransaction) => {
    setFormError(null);
    setSettleTarget(tx);
  };

  const handleCreateCredit = async () => {
    if (!creditName.trim()) {
      setFormError(t('credits.name_required'));
      return;
    }
    if (!creditAmount || creditAmount <= 0) {
      setFormError(t('credits.amount_required'));
      return;
    }

    setIsCreating(true);
    setFormError(null);
    try {
      await createWalletTransaction({
        transaction_type: "credit",
        customer_name: creditName.trim(),
        amount: creditAmount,
        is_credit: true,
      });
      setCreateOpen(false);
      setCreditName("");
      setCreditAmount(undefined);
      fetchCredits();
    } catch (error: any) {
      console.error("Failed to create credit", error);
      setFormError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSettle = async () => {
    if (!settleTarget) return;

    setIsSettling(true);
    setFormError(null);
    try {
      const updateData = {
        transaction_type: settleTarget.transaction_type,
        amount: parseFloat(settleTarget.amount.toString()),
        profit: parseFloat((settleTarget.profit || 0).toString()),
        is_credit: false,
        customer_id: settleTarget.customer_id,
        // The name already lives in `notes`, so re-sending it would duplicate the prefix.
        customer_name: null,
        from_wallet_account_id: settleTarget.from_wallet_account_id,
        to_wallet_account_id: settleTarget.to_wallet_account_id,
        profit_wallet_account_id: null,
        notes: settleTarget.notes,
      };

      await updateWalletTransaction(settleTarget.id, updateData);
      setSettleTarget(null);
      fetchCredits();
    } catch (error: any) {
      console.error("Failed to settle credit", error);
      setFormError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setIsSettling(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{t('credits.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('credits.desc')}</p>
        </div>
        <Button
          onClick={() => {
            setCreditName("");
            setCreditAmount(undefined);
            setFormError(null);
            setCreateOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('credits.add_credit')}
        </Button>
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
              {formatCurrency(totalOutstanding)}
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
          onMarkSettled={openSettle}
        />
      )}

      {/* New Credit Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !isCreating && setCreateOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('credits.add_credit')}</DialogTitle>
            <DialogDescription>{t('credits.add_credit_desc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="credit-name">{t('credits.borrower')}</Label>
              <Input
                id="credit-name"
                value={creditName}
                onChange={(e) => setCreditName(e.target.value)}
                placeholder={t('credits.borrower')}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit-amount">{t('common.amount')}</Label>
              <NumberInput
                id="credit-amount"
                value={creditAmount ?? ""}
                onValueChange={(value) => setCreditAmount(value)}
                placeholder="0"
              />
            </div>
            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateCredit} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Confirmation Dialog */}
      <Dialog open={!!settleTarget} onOpenChange={(open) => !open && !isSettling && setSettleTarget(null)}>
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
                  {formatCurrency(parseFloat(settleTarget.amount.toString()))}
                </span>
              </div>

              {isManualCredit && (
                <p className="text-xs text-muted-foreground">{t('credits.repay_record_only')}</p>
              )}

              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleTarget(null)} disabled={isSettling}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSettle}
              disabled={isSettling}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
