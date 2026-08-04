"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { WalletTransaction } from "@/lib/api/wallet-transactions";
import { Button } from "@/components/ui/button";

interface CreditListProps {
  data: WalletTransaction[];
  onMarkSettled: (tx: WalletTransaction) => void;
}

export function CreditList({ data, onMarkSettled }: CreditListProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  // Group transactions by customer
  const groupedCredits: Record<string, { total: number; transactions: WalletTransaction[] }> = {};
  
  data.forEach(tx => {
    // Determine customer name: either from relationship, or from notes "Customer: Name | ..."
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
        No active credits found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedCredits).map(([customer, group]) => {
        const isExpanded = expandedCustomers[customer];
        
        return (
          <div key={customer} className="border rounded-md bg-card overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCustomer(customer)}
            >
              <div className="flex items-center space-x-2">
                {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                <h3 className="font-semibold text-lg">{customer}</h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full ml-2">
                  {group.transactions.length} txns
                </span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(group.total)}
              </div>
            </div>
            
            {isExpanded && (
              <div className="border-t bg-muted/20">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Receipt #</th>
                      <th className="px-4 py-2 font-medium">Flow</th>
                      <th className="px-4 py-2 font-medium text-right">Amount</th>
                      <th className="px-4 py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-mono">{tx.transaction_number}</td>
                        <td className="px-4 py-3">
                          {tx.transaction_type === "deposit" ? "Deposit" : tx.transaction_type === "withdrawal" ? "Withdrawal" : "Transfer"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(parseFloat(tx.amount.toString()))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkSettled(tx);
                            }}
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-600" />
                            Mark Settled
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
