"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Wallet Transactions</h1>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search receipt # or notes..."
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
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete transaction{" "}
              <strong>{deleteTarget?.transaction_number}</strong>? This will reverse all wallet balance changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
