"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
import { WalletTransaction } from "@/lib/api/wallet-transactions";
import { Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, X } from "lucide-react";

const THB_WALLET_TYPES = [
  "Thai Bank", "KBank", "BBL", "SCB", "KTB", "TTB", "CIMBT", "BAY", "LHBank", "KKP", "UOBT"
];

const emptyToNull = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().uuid("Invalid wallet").nullable().optional()
);

const transactionSchema = z.object({
  transaction_type: z.enum(["deposit", "withdrawal", "transfer"]),
  customer_name: z.string().optional().nullable(),
  from_wallet_account_id: emptyToNull,
  to_wallet_account_id: emptyToNull,
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  profit: z.coerce.number().min(0, "Profit cannot be negative").default(0),
  profit_wallet_account_id: emptyToNull,
  notes: z.string().optional().nullable(),
  is_credit: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.transaction_type === "deposit") {
    if (!data.from_wallet_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select the bank/wallet to transfer to customer",
        path: ["from_wallet_account_id"],
      });
    }
    if (!data.to_wallet_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select the cash wallet to receive cash",
        path: ["to_wallet_account_id"],
      });
    }
  } else if (data.transaction_type === "withdrawal") {
    if (!data.from_wallet_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select the cash wallet to pay out cash",
        path: ["from_wallet_account_id"],
      });
    }
    if (!data.to_wallet_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select the bank/wallet receiving customer transfer",
        path: ["to_wallet_account_id"],
      });
    }
  } else if (data.transaction_type === "transfer") {
    if (!data.to_wallet_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select the receiving wallet (Transfer In)",
        path: ["to_wallet_account_id"],
      });
    }
    if (!data.from_wallet_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select the sending wallet (Transfer Out)",
        path: ["from_wallet_account_id"],
      });
    }
  }

  if (
    data.from_wallet_account_id &&
    data.to_wallet_account_id &&
    data.from_wallet_account_id === data.to_wallet_account_id
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sending and receiving wallets must be different",
      path: ["to_wallet_account_id"],
    });
  }
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

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

  const isCashWallet = (w: WalletAccount) =>
    w.wallet_type?.name?.toLowerCase() === "cash" ||
    w.wallet_type?.code?.toUpperCase() === "CASH" ||
    w.account_name?.toLowerCase().includes("cash");

  const myanmarWallets = wallets.filter(
    (w) => w.is_active && w.wallet_type && !THB_WALLET_TYPES.includes(w.wallet_type.name)
  );
  const cashWallets = myanmarWallets.filter(isCashWallet);
  const bankWallets = myanmarWallets.filter((w) => !isCashWallet(w));
  const defaultCashWalletId = (cashWallets.length > 0 ? cashWallets[0] : myanmarWallets[0])?.id || "";

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      transaction_type: "deposit",
      customer_name: "",
      from_wallet_account_id: "",
      to_wallet_account_id: defaultCashWalletId,
      amount: "" as any,
      profit: "" as any,
      profit_wallet_account_id: "",
      notes: "",
      is_credit: false,
    },
  });

  const transactionType = watch("transaction_type");
  const fromWalletId = watch("from_wallet_account_id");
  const toWalletId = watch("to_wallet_account_id");
  const profitWalletId = watch("profit_wallet_account_id");
  const isCredit = watch("is_credit");

  useEffect(() => {
    if (open && transaction) {
      let txType: "deposit" | "withdrawal" | "transfer" = "deposit";
      if (transaction.transaction_type === "withdrawal") {
        txType = "withdrawal";
      } else if (transaction.transaction_type === "transfer") {
        txType = "transfer";
      } else if (transaction.transaction_type === "deposit") {
        txType = "deposit";
      } else if (transaction.from_wallet_account_id && transaction.to_wallet_account_id) {
        txType = "transfer";
      } else if (transaction.to_wallet_account_id) {
        txType = "withdrawal";
      } else {
        txType = "deposit";
      }

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
        transaction_type: "deposit",
        customer_name: "",
        from_wallet_account_id: "",
        to_wallet_account_id: defaultCashWalletId,
        amount: "" as any,
        profit: "" as any,
        profit_wallet_account_id: "",
        notes: "",
        is_credit: false,
      });
    }
  }, [open, transaction, reset, defaultCashWalletId]);

  const handleFormSubmit = async (data: TransactionFormValues) => {
    try {
      setIsSubmitting(true);

      let payload = {
        transaction_type: data.transaction_type,
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

  const TYPE_OPTIONS = [
    {
      value: "deposit",
      label: "Deposit",
      icon: ArrowDownLeft,
      activeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 font-bold shadow-sm",
      activeIconClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      value: "withdrawal",
      label: "Withdrawal",
      icon: ArrowUpRight,
      activeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30 font-bold shadow-sm",
      activeIconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      value: "transfer",
      label: "Transfer",
      icon: ArrowLeftRight,
      activeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 font-bold shadow-sm",
      activeIconClass: "text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl shadow-xl border-0">
        {/* Header like User Create Form */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40">
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
            {transaction ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5 pt-3 space-y-4">
          {/* Segmented Transaction Type Selector with Custom Selected Colors */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transaction Type
            </Label>
            <div className="grid grid-cols-3 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = transactionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setValue("transaction_type", opt.value as any, { shouldValidate: true });
                      if (opt.value === "deposit") {
                        setValue("from_wallet_account_id", "");
                        setValue("to_wallet_account_id", defaultCashWalletId);
                      } else if (opt.value === "withdrawal") {
                        setValue("from_wallet_account_id", defaultCashWalletId);
                        setValue("to_wallet_account_id", "");
                      } else {
                        setValue("from_wallet_account_id", "");
                        setValue("to_wallet_account_id", "");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-all ${
                      isSelected
                        ? opt.activeClass
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50 font-medium"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? opt.activeIconClass : "text-muted-foreground"}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="space-y-1.5 col-span-2">
              <Label className="text-sm font-medium">Customer Name (Optional)</Label>
              <Input
                {...register("customer_name")}
                placeholder="Enter customer name..."
                className="h-10 rounded-lg"
              />
            </div>

            {/* Wallet Selection depending on Type */}
            {transactionType === "deposit" && (
              <>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-medium">Bank / Wallet (Transfer Out)</Label>
                  <Select
                    value={fromWalletId || ""}
                    onValueChange={(val) => setValue("from_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Select Bank/Wallet">
                        {fromWalletId ? wallets.find(w => w.id === fromWalletId)?.account_name : "Select Bank/Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(bankWallets.length > 0 ? bankWallets : myanmarWallets)
                        .filter(w => w.id !== toWalletId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.from_wallet_account_id && <p className="text-xs text-red-500 font-medium">{errors.from_wallet_account_id.message}</p>}
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-medium">Cash Wallet (Cash In)</Label>
                  <Select
                    value={toWalletId || ""}
                    onValueChange={(val) => setValue("to_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Select Cash Wallet">
                        {toWalletId ? wallets.find(w => w.id === toWalletId)?.account_name : "Select Cash Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(cashWallets.length > 0 ? cashWallets : myanmarWallets)
                        .filter(w => w.id !== fromWalletId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.to_wallet_account_id && <p className="text-xs text-red-500 font-medium">{errors.to_wallet_account_id.message}</p>}
                </div>
              </>
            )}

            {transactionType === "withdrawal" && (
              <>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-medium">Cash Wallet (Cash Out)</Label>
                  <Select
                    value={fromWalletId || ""}
                    onValueChange={(val) => setValue("from_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Select Cash Wallet">
                        {fromWalletId ? wallets.find(w => w.id === fromWalletId)?.account_name : "Select Cash Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(cashWallets.length > 0 ? cashWallets : myanmarWallets)
                        .filter(w => w.id !== toWalletId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.from_wallet_account_id && <p className="text-xs text-red-500 font-medium">{errors.from_wallet_account_id.message}</p>}
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-medium">Bank / Wallet (Receive In)</Label>
                  <Select
                    value={toWalletId || ""}
                    onValueChange={(val) => setValue("to_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Select Bank/Wallet">
                        {toWalletId ? wallets.find(w => w.id === toWalletId)?.account_name : "Select Bank/Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(bankWallets.length > 0 ? bankWallets : myanmarWallets)
                        .filter(w => w.id !== fromWalletId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.to_wallet_account_id && <p className="text-xs text-red-500 font-medium">{errors.to_wallet_account_id.message}</p>}
                </div>
              </>
            )}

            {transactionType === "transfer" && (
              <>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-medium">To Wallet (Transfer In / Receive)</Label>
                  <Select
                    value={toWalletId || ""}
                    onValueChange={(val) => setValue("to_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Select Receiving Wallet">
                        {toWalletId ? wallets.find(w => w.id === toWalletId)?.account_name : "Select Receiving Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {myanmarWallets.filter(w => w.id !== fromWalletId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.to_wallet_account_id && <p className="text-xs text-red-500 font-medium">{errors.to_wallet_account_id.message}</p>}
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-medium">From Wallet (Transfer Out / Send)</Label>
                  <Select
                    value={fromWalletId || ""}
                    onValueChange={(val) => setValue("from_wallet_account_id", val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Select Sending Wallet">
                        {fromWalletId ? wallets.find(w => w.id === fromWalletId)?.account_name : "Select Sending Wallet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {myanmarWallets.filter(w => w.id !== toWalletId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from_wallet_account_id && <p className="text-xs text-red-500 font-medium">{errors.from_wallet_account_id.message}</p>}
                </div>
              </>
            )}

            {errors.root && <p className="text-xs text-red-500 font-medium col-span-2">{errors.root.message}</p>}

            {/* Amount */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-sm font-medium">Amount</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <NumberInput
                    id="amount"
                    value={field.value}
                    onValueChange={(val) => field.onChange(val === undefined ? "" : val)}
                    placeholder="0.00"
                    className="h-10 rounded-lg font-medium"
                  />
                )}
              />
              {errors.amount && <p className="text-xs text-red-500 font-medium">{errors.amount.message}</p>}
            </div>

            {/* Profit */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-sm font-medium">Profit</Label>
              <Controller
                control={control}
                name="profit"
                render={({ field }) => (
                  <NumberInput
                    id="profit"
                    value={field.value}
                    onValueChange={(val) => field.onChange(val === undefined ? 0 : val)}
                    placeholder="0.00"
                    className="h-10 rounded-lg font-medium text-emerald-600 dark:text-emerald-400"
                  />
                )}
              />
              {errors.profit && <p className="text-xs text-red-500 font-medium">{errors.profit.message}</p>}
            </div>

            {/* Profit Store Wallet */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-sm font-medium">Profit Store Wallet</Label>
              <Select
                value={profitWalletId || ""}
                onValueChange={(val) => setValue("profit_wallet_account_id", val === "none" ? "" : val, { shouldValidate: true })}
              >
                <SelectTrigger className="h-10 rounded-lg">
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
            </div>

            {/* Credit Transaction */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-sm font-medium">Credit Transaction</Label>
              <RadioGroup
                value={isCredit ? "yes" : "no"}
                onValueChange={(val) => setValue("is_credit", val === "yes", { shouldValidate: true })}
                className="flex items-center space-x-4 h-10"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="credit-no" />
                  <Label htmlFor="credit-no" className="font-normal cursor-pointer">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="credit-yes" />
                  <Label htmlFor="credit-yes" className="font-normal cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Notes / Remark */}
            <div className="space-y-1.5 col-span-2">
              <Label className="text-sm font-medium">Remark</Label>
              <Textarea {...register("notes")} placeholder="Optional transaction details..." rows={2} className="rounded-lg" />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-5 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
