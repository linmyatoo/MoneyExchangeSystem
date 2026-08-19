"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Customer } from "@/lib/api/customers";
import { WalletAccount } from "@/lib/api/wallets";
import { ExchangeRate } from "@/lib/api/exchange-rates";
import { CurrencyExchange } from "@/lib/api/currency-exchange";

const exchangeSchema = z.object({
  customer_id: z.string().optional().nullable(),
  customer_name: z.string().optional().nullable(),
  mmk_wallet_id: z.string().uuid("Please select MMK Wallet"),
  thb_wallet_id: z.string().uuid("Please select THB Wallet"),
  foreign_amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  local_amount: z.coerce.number().min(1, "MMK amount must be > 0"),
  notes: z.string().optional().nullable(),
});

type ExchangeFormValues = z.infer<typeof exchangeSchema>;

interface SellFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  mmkWallets: WalletAccount[];
  thbWallets: WalletAccount[];
  currentRate?: ExchangeRate | null;
  transaction?: CurrencyExchange | null;
  onSubmit: (data: any) => Promise<void>;
}

export function SellForm({ open, onOpenChange, customers, mmkWallets, thbWallets, currentRate, transaction, onSubmit }: SellFormProps) {
  const isEditing = !!transaction;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ExchangeFormValues>({
    resolver: zodResolver(exchangeSchema) as any,
    defaultValues: {
      customer_id: "",
      customer_name: "",
      mmk_wallet_id: "",
      thb_wallet_id: "",
      foreign_amount: "" as any,
      local_amount: "" as any,
      notes: "",
    },
  });

  const foreignAmount = watch("foreign_amount") || 0;
  const localAmount = watch("local_amount") || 0;
  // The rate is derived from the two amounts, quoted as THB per 100,000 MMK.
  const derivedRate = foreignAmount > 0 && localAmount > 0 ? (100000 * foreignAmount) / localAmount : 0;
  const mmkWalletId = watch("mmk_wallet_id");
  const thbWalletId = watch("thb_wallet_id");


  useEffect(() => {
    if (!open) return;

    if (transaction) {
      reset({
        customer_id: null,
        customer_name: transaction.customer_name || "",
        mmk_wallet_id: transaction.mmk_wallet_id || "",
        thb_wallet_id: transaction.thb_wallet_id || "",
        foreign_amount: transaction.foreign_amount,
        local_amount: transaction.local_amount,
        notes: transaction.notes || "",
      });
      return;
    }

    reset({
      customer_id: null,
      customer_name: "",
      mmk_wallet_id: "",
      thb_wallet_id: "",
      foreign_amount: "" as any,
      local_amount: "" as any,
      notes: "",
    });
  }, [open, reset, currentRate, transaction]);

  const handleFormSubmit = async (data: ExchangeFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      // Convert empty strings to null for optional UUID/string fields
      const sanitized = {
        ...data,
        customer_id: null,
        customer_name: data.customer_name || null,
        notes: data.notes || null,
      };
      await onSubmit(sanitized);
      onOpenChange(false);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.detail || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
        <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-blue-600 flex items-center gap-2">
              {isEditing ? "Edit Sell" : "Sell THB"} <span className="text-sm font-medium text-slate-500">(Customer gives MMK)</span>
            </DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-5 py-5">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              ⚠ {submitError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Customer Name (Optional)</Label>
            <Input {...register("customer_name")} placeholder="Enter customer name..." className="h-10 border-slate-200 focus:ring-blue-500 transition-all" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">THB Amount (We Pay)</Label>
            <Controller
              control={control}
              name="foreign_amount"
              render={({ field }) => (
                <NumberInput
                  id="foreign_amount"
                  value={field.value}
                  onValueChange={(val) => field.onChange(val === undefined ? "" : val)}
                  placeholder="0.00"
                  className="h-10 border-slate-200 focus:ring-blue-500 transition-all font-medium"
                />
              )}
            />
            {errors.foreign_amount && <p className="text-sm text-red-500">{errors.foreign_amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">MMK Amount (We Receive)</Label>
            <Controller
              control={control}
              name="local_amount"
              render={({ field }) => (
                <NumberInput
                  id="local_amount"
                  value={field.value}
                  onValueChange={(val) => field.onChange(val === undefined ? "" : val)}
                  placeholder="0"
                  className="h-10 border-slate-200 focus:ring-blue-500 transition-all font-medium"
                />
              )}
            />
            {errors.local_amount && <p className="text-sm text-red-500">{errors.local_amount.message}</p>}
          </div>

          <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-xl">
            <Label className="text-blue-700 font-semibold text-xs uppercase tracking-wider">Exchange Rate (THB per 100,000 MMK)</Label>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(derivedRate)}
            </div>
            {currentRate && (
              <div className="text-xs font-medium text-blue-900/60 mt-1">
                Current sell rate: {new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(currentRate.sell_rate)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Pay THB From</Label>
              <Select 
                value={thbWalletId || ""} 
                onValueChange={(val) => setValue("thb_wallet_id", val || "", { shouldValidate: true })}
              >
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="THB Wallet">
                    {thbWalletId ? thbWallets.find(w => w.id === thbWalletId)?.account_name : "THB Wallet"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {thbWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.thb_wallet_id && <p className="text-sm text-red-500">{errors.thb_wallet_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Receive MMK Into</Label>
              <Select 
                value={mmkWalletId || ""} 
                onValueChange={(val) => setValue("mmk_wallet_id", val || "", { shouldValidate: true })}
              >
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="MMK Wallet">
                    {mmkWalletId ? mmkWallets.find(w => w.id === mmkWalletId)?.account_name : "MMK Wallet"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mmkWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mmk_wallet_id && <p className="text-sm text-red-500">{errors.mmk_wallet_id.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Remark</Label>
            <Textarea {...register("notes")} rows={2} className="border-slate-200 focus:ring-blue-500 transition-all resize-none" />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-10 px-4 rounded-md text-slate-600 hover:text-slate-900 border-slate-200 transition-colors">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm">
              {isSubmitting ? "Processing..." : isEditing ? "Save Changes" : "Confirm Sell"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
