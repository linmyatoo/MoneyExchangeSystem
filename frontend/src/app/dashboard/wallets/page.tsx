"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletList } from "./wallet-list";
import { WalletForm } from "./wallet-form";
import {
  WalletAccount,
  WalletType,
  getWalletAccounts,
  getWalletTypes,
  createWalletAccount,
  updateWalletAccount,
  activateWalletAccount,
  deactivateWalletAccount,
} from "@/lib/api/wallets";

const THB_WALLET_TYPES = [
  "Thai Bank", "KBank", "BBL", "SCB", "KTB", "TTB", "CIMBT", "BAY", "LHBank", "KKP", "UOBT"
];

export default function WalletsPage() {
  const { t } = useLanguage();
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [walletTypes, setWalletTypes] = useState<WalletType[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Form states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletAccount | null>(null);

  useEffect(() => {
    fetchWalletTypes();
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [page, search]);

  const fetchWalletTypes = async () => {
    try {
      const types = await getWalletTypes();
      setWalletTypes(types);
    } catch (error) {
      console.error("Error fetching wallet types:", error);
    }
  };

  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const response = await getWalletAccounts({
        page,
        page_size: 10,
        q: search,
      });
      setWallets(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: any) => {
    if (selectedWallet) {
      await updateWalletAccount(selectedWallet.id, {
        account_name: data.account_name,
        account_number: data.account_number,
        balance: data.balance,
      });
    } else {
      await createWalletAccount(data);
    }
    fetchWallets();
  };

  const handleToggleStatus = async (wallet: WalletAccount) => {
    try {
      if (wallet.is_active) {
        await deactivateWalletAccount(wallet.id);
      } else {
        await activateWalletAccount(wallet.id);
      }
      fetchWallets();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const [formType, setFormType] = useState<"myanmar" | "thai" | null>(null);

  const openCreateForm = (type: "myanmar" | "thai") => {
    setSelectedWallet(null);
    setFormType(type);
    setIsFormOpen(true);
  };

  const openEditForm = (wallet: WalletAccount) => {
    setSelectedWallet(wallet);
    setFormType(THB_WALLET_TYPES.includes(wallet.wallet_type.name) ? "thai" : "myanmar");
    setIsFormOpen(true);
  };

  const filteredWalletTypes = walletTypes.filter(type => {
    if (formType === "thai") return THB_WALLET_TYPES.includes(type.name);
    if (formType === "myanmar") return !THB_WALLET_TYPES.includes(type.name);
    return true; // fallback
  });

  const myanmarWallets = wallets.filter(w => !THB_WALLET_TYPES.includes(w.wallet_type.name));
  const thaiWallets = wallets.filter(w => THB_WALLET_TYPES.includes(w.wallet_type.name));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('wallets.title')}</h1>
          <p className="text-muted-foreground text-xs mt-1">{t('wallets.desc')}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => openCreateForm("myanmar")} className="shadow-sm transition-all rounded-md h-10 px-4 font-medium">
            <Plus className="mr-2 h-4 w-4" />
            {t('wallets.add_mmk_wallet')}
          </Button>
          <Button onClick={() => openCreateForm("thai")} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all rounded-md h-10 px-4 font-medium">
            <Plus className="mr-2 h-4 w-4" />
            {t('wallets.add_thb_wallet')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('wallets.search_placeholder')}
            className="pl-9 h-10 border-slate-200 text-sm focus:ring-blue-500 transition-all placeholder:text-slate-400"
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
        <div className="space-y-12">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                {t('wallets.myanmar_accounts')}
                <span className="ml-3 px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {myanmarWallets.length}
                </span>
              </h2>
            </div>
            <div className="p-0">
              <WalletList
                data={myanmarWallets}
                onEdit={openEditForm}
                onToggleStatus={handleToggleStatus}
                currency="MMK"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                {t('wallets.thai_accounts')}
                <span className="ml-3 px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                  {thaiWallets.length}
                </span>
              </h2>
            </div>
            <div className="p-0">
              <WalletList
                data={thaiWallets}
                onEdit={openEditForm}
                onToggleStatus={handleToggleStatus}
                currency="THB"
              />
            </div>
          </div>
        </div>
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

      <WalletForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        wallet={selectedWallet}
        walletTypes={filteredWalletTypes}
        onSubmit={handleCreateOrUpdate}
      />
    </div>
  );
}
