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
  const customerId = watch("customer_id");

  useEffect(() => {
    if (open) {
      reset({
        customer_id: "",
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
        customer_id: data.customer_id && data.customer_id !== "walkin" ? data.customer_id : null,
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-green-600">Buy THB (Customer gives THB)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              ⚠ {submitError}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <Select 
                value={customerId || ""} 
                onValueChange={(val) => {
                  setValue("customer_id", val || "", { shouldValidate: true });
                  if (val) setValue("customer_name", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Existing Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walkin">-- Walk-in --</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Or Walk-in Name</Label>
              <Input {...register("customer_name")} disabled={!!customerId && customerId !== "walkin"} placeholder="John Doe" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>THB Amount (We Receive)</Label>
            <Input type="number" step="0.01" {...register("foreign_amount")} />
            {errors.foreign_amount && <p className="text-sm text-red-500">{errors.foreign_amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Exchange Rate (THB per 100,000 MMK)</Label>
            <Input type="number" step="0.0001" {...register("rate_used")} />
          </div>

          <div className="p-3 bg-gray-100 rounded-md">
            <Label className="text-gray-500">MMK Amount (We Pay)</Label>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(rateUsed ? (100000 / rateUsed) * foreignAmount : 0)} K
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pay MMK From</Label>
              <Select 
                value={mmkWalletId || ""} 
                onValueChange={(val) => setValue("mmk_wallet_id", val || "", { shouldValidate: true })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Store THB In</Label>
              <Select 
                value={thbWalletId || ""} 
                onValueChange={(val) => setValue("thb_wallet_id", val || "", { shouldValidate: true })}
              >
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Remark</Label>
            <Input {...register("notes")} />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Processing..." : "Confirm Buy"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
