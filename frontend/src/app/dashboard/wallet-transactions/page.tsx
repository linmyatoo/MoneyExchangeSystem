"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionList } from "./transaction-list";
import { TransactionForm } from "./transaction-form";
import {
  WalletTransaction,
  getWalletTransactions,
  createWalletTransaction,
  updateWalletTransaction,
  deleteWalletTransaction,
} from "@/lib/api/wallet-transactions";
import { Customer, getCustomers } from "@/lib/api/customers";
import { WalletAccount, getWalletAccounts } from "@/lib/api/wallets";

export default function WalletTransactionsPage() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wallets, setWallets] = useState<WalletAccount[]>([]);

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<string>("today");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Form states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WalletTransaction | null>(null);

  useEffect(() => {
    fetchCustomersAndWallets();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, search, period]);

  const fetchCustomersAndWallets = async () => {
    try {
      const [customersRes, walletsRes] = await Promise.all([
        getCustomers({ page_size: 100 }),
        getWalletAccounts({ page_size: 100 })
      ]);
      setCustomers(customersRes.items);
      setWallets(walletsRes.items);
    } catch (error) {
      console.error("Error fetching prerequisites:", error);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await getWalletTransactions({
        page,
        page_size: 10,
        q: search,
        period: period || undefined,
      });
      setTransactions(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: any) => {
    try {
      if (data.customer_id === "none" || data.customer_id === "") {
        data.customer_id = null;
      }
      if (selectedTransaction) {
        await updateWalletTransaction(selectedTransaction.id, data);
      } else {
        await createWalletTransaction(data);
      }
      fetchTransactions();
      fetchCustomersAndWallets(); // Refresh wallet balances
    } catch (error) {
      console.error("Failed to save transaction", error);
      alert("Failed to save transaction. Please check wallet balances.");
    }
  };

  const handleEdit = (tx: WalletTransaction) => {
    setSelectedTransaction(tx);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWalletTransaction(deleteTarget.id);
      fetchTransactions();
      fetchCustomersAndWallets(); // Refresh wallet balances
    } catch (error) {
      console.error("Failed to delete transaction", error);
      alert("Failed to delete transaction.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const openCreateForm = () => {
    setSelectedTransaction(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('transactions.title')}</h1>
          <p className="text-muted-foreground text-xs mt-1">{t('transactions.desc')}</p>
        </div>
        <Button onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all rounded-md h-10 px-4 font-medium">
          <Plus className="mr-2 h-4 w-4" />
          {t('transactions.create_transaction')}
        </Button>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('transactions.search_placeholder')}
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
          <option value="">{t('common.all')}</option>
          <option value="today">{t('dashboard.daily')}</option>
          <option value="this_month">{t('dashboard.monthly')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <TransactionList
          data={transactions}
          onEdit={handleEdit}
          onDelete={(tx) => setDeleteTarget(tx)}
        />
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

      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customers={customers}
        wallets={wallets}
        transaction={selectedTransaction}
        onSubmit={handleCreateOrUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.transaction_number}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
