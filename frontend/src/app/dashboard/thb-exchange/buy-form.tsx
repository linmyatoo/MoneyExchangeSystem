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

const exchangeSchema = z.object({
  customer_id: z.string().optional().nullable(),
  customer_name: z.string().optional().nullable(),
  mmk_wallet_id: z.string().uuid("Please select MMK Wallet"),
  thb_wallet_id: z.string().uuid("Please select THB Wallet"),
  foreign_amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  rate_used: z.coerce.number().min(0.0001, "Rate must be > 0"),
  notes: z.string().optional().nullable(),
});

type ExchangeFormValues = z.infer<typeof exchangeSchema>;

interface BuyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  mmkWallets: WalletAccount[];
  thbWallets: WalletAccount[];
  currentRate?: ExchangeRate | null;
  onSubmit: (data: any) => Promise<void>;
}

export function BuyForm({ open, onOpenChange, customers, mmkWallets, thbWallets, currentRate, onSubmit }: BuyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      rate_used: 0,
      notes: "",
    },
  });

  const foreignAmount = watch("foreign_amount") || 0;
  const rateUsed = watch("rate_used") || 0;
  const mmkWalletId = watch("mmk_wallet_id");
  const thbWalletId = watch("thb_wallet_id");


  useEffect(() => {
    if (open) {
      reset({
        customer_id: null,
        customer_name: "",
        mmk_wallet_id: "",
        thb_wallet_id: "",
        foreign_amount: "" as any,
        rate_used: currentRate ? currentRate.buy_rate : 0,
        notes: "",
      });
    }
  }, [open, reset, currentRate]);

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
      const msg = error?.response?.data?.detail || "Failed to submit. Please try again.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
        <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-emerald-600 flex items-center gap-2">
              Buy THB <span className="text-sm font-medium text-slate-500">(Customer gives THB)</span>
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
            <Input {...register("customer_name")} placeholder="Enter customer name..." className="h-10 border-slate-200 focus:ring-emerald-500 transition-all" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">THB Amount (We Receive)</Label>
            <Controller
              control={control}
              name="foreign_amount"
              render={({ field }) => (
                <NumberInput
                  id="foreign_amount"
                  value={field.value}
                  onValueChange={(val) => field.onChange(val === undefined ? "" : val)}
                  placeholder="0.00"
                  className="h-10 border-slate-200 focus:ring-emerald-500 transition-all font-medium"
                />
              )}
            />
            {errors.foreign_amount && <p className="text-sm text-red-500">{errors.foreign_amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Exchange Rate (THB per 100,000 MMK)</Label>
            <Controller
              control={control}
              name="rate_used"
              render={({ field }) => (
                <NumberInput
                  id="rate_used"
                  value={field.value}
                  onValueChange={(val) => field.onChange(val === undefined ? "" : val)}
                  placeholder="0.00"
                  className="h-10 border-slate-200 focus:ring-emerald-500 transition-all font-medium"
                />
              )}
            />
            {errors.rate_used && <p className="text-sm text-red-500">{errors.rate_used.message}</p>}
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <Label className="text-emerald-700 font-semibold text-xs uppercase tracking-wider">MMK Amount (We Pay)</Label>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(rateUsed ? (100000 / rateUsed) * foreignAmount : 0)} K
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Pay MMK From</Label>
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

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Store THB In</Label>
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
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Remark</Label>
            <Textarea {...register("notes")} rows={2} className="border-slate-200 focus:ring-emerald-500 transition-all resize-none" />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-10 px-4 rounded-md text-slate-600 hover:text-slate-900 border-slate-200 transition-colors">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
              {isSubmitting ? "Processing..." : "Confirm Buy"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
