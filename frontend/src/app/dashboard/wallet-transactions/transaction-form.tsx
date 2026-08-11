"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Customer } from "@/lib/api/customers";
import { WalletAccount } from "@/lib/api/wallets";

const THB_WALLET_TYPES = [
  "Thai Bank", "KBank", "BBL", "SCB", "KTB", "TTB", "CIMBT", "BAY", "LHBank", "KKP", "UOBT"
];

const emptyToNull = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().uuid("Invalid wallet").nullable()
);

const transactionSchema = z.object({
  transaction_type: z.enum(["cash_to_wallet", "wallet_to_wallet", "wallet_to_cash"]),
  customer_name: z.string().optional().nullable(),
  from_wallet_account_id: emptyToNull,
  to_wallet_account_id: emptyToNull,
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  profit: z.coerce.number().min(0, "Profit cannot be negative").default(0),
  profit_wallet_account_id: emptyToNull,
  notes: z.string().optional().nullable(),
  is_credit: z.boolean().default(false),
}).refine(data => {
  return !!data.from_wallet_account_id && !!data.to_wallet_account_id && data.from_wallet_account_id !== data.to_wallet_account_id;
}, {
  message: "Please select two different wallets",
  path: ["from_wallet_account_id"]
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

import { WalletTransaction } from "@/lib/api/wallet-transactions";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  wallets: WalletAccount[];
  transaction?: WalletTransaction | null;
  onSubmit: (data: any) => Promise<void>;
}

export function TransactionForm({ open, onOpenChange, customers, wallets, transaction, onSubmit }: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      transaction_type: "cash_to_wallet",
      customer_name: "",
      from_wallet_account_id: "",
      to_wallet_account_id: "",
      amount: "" as any,
      profit: "" as any,
      profit_wallet_account_id: "",
      notes: "",
      is_credit: false,
    },
  });

  const transactionType = watch("transaction_type");
  const customerId = watch("customer_name");
  const fromWalletId = watch("from_wallet_account_id");
  const toWalletId = watch("to_wallet_account_id");
  const profitWalletId = watch("profit_wallet_account_id");
  const isCredit = watch("is_credit");

  useEffect(() => {
    if (open && transaction) {
      // Determine transaction_type from the existing transaction
      let txType: "cash_to_wallet" | "wallet_to_wallet" | "wallet_to_cash" = "cash_to_wallet";
      if (transaction.from_wallet_account_id && transaction.to_wallet_account_id) {
        txType = "wallet_to_wallet";
      } else if (transaction.from_wallet_account_id && !transaction.to_wallet_account_id) {
        // Could be cash_to_wallet (deposit) or wallet_to_cash (withdrawal)
        // Use transaction_type from backend if available
        txType = transaction.transaction_type === "withdrawal" ? "wallet_to_cash" : "cash_to_wallet";
      }

      // Extract customer name from notes if present
      let customerName = "";
      let notes = transaction.notes || "";
      if (notes.startsWith("Customer: ")) {
        const parts = notes.split(" | ");
        customerName = parts[0].replace("Customer: ", "");
        notes = parts.slice(1).join(" | ");
      }

      reset({
        transaction_type: txType,
        customer_name: customerName,
        from_wallet_account_id: transaction.from_wallet_account_id || "",
        to_wallet_account_id: transaction.to_wallet_account_id || "",
        amount: transaction.amount,
        profit: transaction.profit,
        profit_wallet_account_id: "",
        notes: notes,
        is_credit: transaction.is_credit,
      });
    } else if (open) {
      reset({
        transaction_type: "cash_to_wallet",
        customer_name: "",
        from_wallet_account_id: "",
        to_wallet_account_id: "",
        amount: "" as any,
        profit: "" as any,
        profit_wallet_account_id: "",
        notes: "",
        is_credit: false,
      });
    }
  }, [open, transaction, reset]);

  const myanmarWallets = wallets.filter(w => w.is_active && w.wallet_type && !THB_WALLET_TYPES.includes(w.wallet_type.name));

  const handleFormSubmit = async (data: TransactionFormValues) => {
    try {
      setIsSubmitting(true);

      // Clean up payload based on type
      let payload = {
        customer_name: data.customer_name || null,
        from_wallet_account_id: data.from_wallet_account_id || null,
        to_wallet_account_id: data.to_wallet_account_id || null,
        amount: data.amount || 0,
        profit: data.profit || 0,
        profit_wallet_account_id: data.profit_wallet_account_id || null,
        notes: data.notes || null,
        is_credit: data.is_credit,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save transaction", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">{transaction ? "Edit Transaction" : "New Wallet Transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Transaction Type</Label>
              <Select
                value={transactionType}
                onValueChange={(val) => {
                  setValue("transaction_type", val as any, { shouldValidate: true });
                  setValue("from_wallet_account_id", "");
                  setValue("to_wallet_account_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_to_wallet">Cash → Wallet (Deposit)</SelectItem>
                  <SelectItem value="wallet_to_cash">Wallet → Cash (Withdrawal)</SelectItem>
                  <SelectItem value="wallet_to_wallet">Wallet → Wallet (Transfer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Customer Name (Optional)</Label>
              <Input
                {...register("customer_name")}
                placeholder="Enter customer name..."
              />
            </div>

            {transactionType === "cash_to_wallet" ? (
              <>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Cash Goes To Wallet</Label>
                  <Select
                    value={toWalletId || ""}
                    onValueChange={(val) => setValue("to_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Wallet">
                        {toWalletId ? wallets.find(w => w.id === toWalletId)?.account_name : "Select Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {myanmarWallets.filter(w => w.id !== fromWalletId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.to_wallet_account_id && <p className="text-sm text-red-500">{errors.to_wallet_account_id.message}</p>}
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Transfer From Wallet</Label>
                  <Select
                    value={fromWalletId || ""}
                    onValueChange={(val) => setValue("from_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Wallet">
                        {fromWalletId ? wallets.find(w => w.id === fromWalletId)?.account_name : "Select Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {myanmarWallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from_wallet_account_id && <p className="text-sm text-red-500">{errors.from_wallet_account_id.message}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>{transactionType === "wallet_to_cash" ? "Receive Payment Into Wallet" : "Money Goes To Wallet"}</Label>
                  <Select
                    value={toWalletId || ""}
                    onValueChange={(val) => setValue("to_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Wallet">
                        {toWalletId ? wallets.find(w => w.id === toWalletId)?.account_name : "Select Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {myanmarWallets.filter(w => w.id !== fromWalletId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.to_wallet_account_id && <p className="text-sm text-red-500">{errors.to_wallet_account_id.message}</p>}
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>{transactionType === "wallet_to_cash" ? "Take Cash From Wallet" : "Money Transfer From Wallet"}</Label>
                  <Select
                    value={fromWalletId || ""}
                    onValueChange={(val) => setValue("from_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Wallet">
                        {fromWalletId ? wallets.find(w => w.id === fromWalletId)?.account_name : "Select Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {myanmarWallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from_wallet_account_id && <p className="text-sm text-red-500">{errors.from_wallet_account_id.message}</p>}
                </div>
              </>
            )}

            {errors.root && <p className="text-sm text-red-500 col-span-2">{errors.root.message}</p>}

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Profit</Label>
              <Input type="number" step="0.01" {...register("profit")} />
              {errors.profit && <p className="text-sm text-red-500">{errors.profit.message}</p>}
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Profit Store Wallet</Label>
              <Select
                value={profitWalletId || ""}
                onValueChange={(val) => setValue("profit_wallet_account_id", val === "none" ? "" : val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Wallet">
                    {profitWalletId ? wallets.find(w => w.id === profitWalletId)?.account_name : "Select Wallet"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {myanmarWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Profit will be added to this wallet</p>
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Credit Transaction</Label>
              <RadioGroup
                value={isCredit ? "yes" : "no"}
                onValueChange={(val) => setValue("is_credit", val === "yes", { shouldValidate: true })}
                className="flex items-center space-x-4 h-9"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="credit-no" />
                  <Label htmlFor="credit-no" className="font-normal">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="credit-yes" />
                  <Label htmlFor="credit-yes" className="font-normal">Yes</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Remark</Label>
              <Textarea {...register("notes")} placeholder="Optional details..." rows={2} />
            </div>

          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Confirm Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
