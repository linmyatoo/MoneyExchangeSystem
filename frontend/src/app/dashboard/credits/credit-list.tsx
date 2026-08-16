"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, UserCircle2 } from "lucide-react";
import { WalletTransaction } from "@/lib/api/wallet-transactions";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface CreditListProps {
  data: WalletTransaction[];
  onMarkSettled: (tx: WalletTransaction) => void;
}

export function CreditList({ data, onMarkSettled }: CreditListProps) {
  const { t } = useLanguage();
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  // Group transactions by customer
  const groupedCredits: Record<string, { total: number; transactions: WalletTransaction[] }> = {};
  
  data.forEach(tx => {
    let customerName = tx.customer?.name;
    if (!customerName && tx.notes?.startsWith("Customer: ")) {
      customerName = tx.notes.split(" | ")[0].replace("Customer: ", "");
    }
    const name = customerName || "Unknown Customer";

    if (!groupedCredits[name]) {
      groupedCredits[name] = { total: 0, transactions: [] };
    }
    groupedCredits[name].transactions.push(tx);
    groupedCredits[name].total += parseFloat(tx.amount.toString());
  });

  const toggleCustomer = (name: string) => {
    setExpandedCustomers(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "MMK", minimumFractionDigits: 0 }).format(amount);
  };

  if (Object.keys(groupedCredits).length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        {t('credits.no_credits')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedCredits).map(([customer, group]) => {
        const isExpanded = expandedCustomers[customer];
        
        return (
          <div key={customer} className="rounded-lg border bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300">
            <div 
              className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all"
              onClick={() => toggleCustomer(customer)}
            >
              <div className="flex items-center space-x-3 mb-1 sm:mb-0">
                <div className={`transition-transform duration-200 ${isExpanded ? 'text-blue-600 rotate-90' : 'text-slate-400'}`}>
                  <ChevronRight className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">{customer}</h3>
                    <div className="flex items-center">
                      <span className="text-[11px] font-medium text-slate-500">
                        {new Intl.NumberFormat("en-US").format(group.transactions.length)} {t('common.active')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:items-end">
                <div className="text-lg font-bold text-red-600 tracking-tight">
                  {formatCurrency(group.total)}
                </div>
              </div>
            </div>
            
            <div 
              className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-slate-100 bg-slate-50 p-2 sm:p-4">
                  <div className="rounded border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 text-xs">
                        <tr>
                          <th className="pl-6 pr-4 py-2 font-medium">{t('common.date')}</th>
                          <th className="px-4 py-2 font-medium">{t('transactions.reference_no')}</th>
                          <th className="px-4 py-2 font-medium">{t('common.type')}</th>
                          <th className="px-4 py-2 font-medium text-right">{t('common.amount')}</th>
                          <th className="pl-4 pr-6 py-2 font-medium text-right">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="pl-6 pr-4 py-2 whitespace-nowrap text-slate-600 text-xs">
                              {new Date(tx.transaction_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className="font-mono text-xs font-medium text-slate-600">{tx.transaction_number}</span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs">
                              <span className={`${
                                tx.transaction_type === 'deposit' ? 'text-emerald-600 font-medium' :
                                tx.transaction_type === 'withdrawal' ? 'text-orange-600 font-medium' :
                                'text-blue-600 font-medium'
                              }`}>
                                {tx.transaction_type === "deposit" ? t('transactions.deposit') : tx.transaction_type === "withdrawal" ? t('transactions.withdraw') : t('transactions.transfer')}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-slate-700">
                              {formatCurrency(parseFloat(tx.amount.toString()))}
                            </td>
                            <td className="pl-4 pr-6 py-2 whitespace-nowrap text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkSettled(tx);
                                }}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                {t('credits.repay')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
