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
import { WalletAccount, WalletType } from "@/lib/api/wallets";
import { useLanguage } from "@/i18n/LanguageContext";

const walletSchema = z.object({
  account_name: z.string().min(2, "Name must be at least 2 characters").max(255),
  account_number: z.string().max(100).optional().nullable(),
  wallet_type_id: z.string().uuid("Invalid wallet type"),
  opening_balance: z.coerce.number().min(0, "Opening balance cannot be negative"),
  balance: z.coerce.number().min(0, "Balance cannot be negative").optional(),
  is_active: z.boolean(),
});

type WalletFormValues = z.infer<typeof walletSchema>;

interface WalletFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletAccount | null;
  walletTypes: WalletType[];
  onSubmit: (data: WalletFormValues) => Promise<void>;
}

export function WalletForm({ open, onOpenChange, wallet, walletTypes, onSubmit }: WalletFormProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema) as any,
    defaultValues: {
      account_name: "",
      account_number: "",
      wallet_type_id: "",
      opening_balance: "" as any,
      is_active: true,
    },
  });

  const walletTypeId = watch("wallet_type_id");
  const isActive = watch("is_active");

  useEffect(() => {
    if (wallet) {
      reset({
        account_name: wallet.account_name,
        account_number: wallet.account_number || "",
        wallet_type_id: wallet.wallet_type_id,
        opening_balance: wallet.opening_balance,
        balance: wallet.balance,
        is_active: wallet.is_active,
      });
    } else {
      reset({
        account_name: "",
        account_number: "",
        wallet_type_id: "",
        opening_balance: "" as any,
        is_active: true,
      });
    }
  }, [wallet, reset]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset({
        account_name: "",
        account_number: "",
        wallet_type_id: "",
        opening_balance: "" as any,
        is_active: true,
      });
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: WalletFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit({
        ...data,
        account_number: data.account_number || null, // Convert empty string to null
        opening_balance: data.opening_balance || 0,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save wallet", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
        <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-800">{wallet ? t('wallets.edit_wallet') : t('wallets.add_wallet')}</DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="account_name" className="font-semibold text-slate-700">{t('wallets.wallet_name')}</Label>
            <Input id="account_name" {...register("account_name")} placeholder={t('wallets.wallet_name')} className="h-10 border-slate-200 focus:ring-blue-500 transition-all" />
            {errors.account_name && <p className="text-sm text-red-500">{errors.account_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wallet_type_id" className="font-semibold text-slate-700">{t('wallets.type')}</Label>
            <Select 
              value={walletTypeId} 
              onValueChange={(val) => setValue("wallet_type_id", val as string, { shouldValidate: true })}
              disabled={!!wallet} // Disallow changing type after creation
            >
              <SelectTrigger className="h-10 border-slate-200">
                <SelectValue placeholder={t('transactions.select_type')}>
                  {walletTypeId ? walletTypes.find(t => t.id === walletTypeId)?.name : t('transactions.select_type')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {walletTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.wallet_type_id && <p className="text-sm text-red-500">{errors.wallet_type_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account_number" className="font-semibold text-slate-700">{t('wallets.account_number')}</Label>
            <Input id="account_number" {...register("account_number")} placeholder="e.g. 09123456789" className="h-10 border-slate-200 focus:ring-blue-500 transition-all" />
            {errors.account_number && <p className="text-sm text-red-500">{errors.account_number.message}</p>}
          </div>

          {!wallet && (
            <div className="space-y-1.5">
              <Label htmlFor="opening_balance" className="font-semibold text-slate-700">{t('cash_register.opening_balance')}</Label>
              <Controller
                control={control}
                name="opening_balance"
                render={({ field }) => (
                  <NumberInput
                    id="opening_balance"
                    value={field.value}
                    onValueChange={(val) => field.onChange(val === undefined ? 0 : val)}
                    placeholder="0.00"
                    className="h-10 border-slate-200 focus:ring-blue-500 transition-all"
                  />
                )}
              />
              {errors.opening_balance && <p className="text-sm text-red-500">{errors.opening_balance.message}</p>}
            </div>
          )}

          {wallet && (
            <div className="space-y-1.5">
              <Label htmlFor="balance" className="font-semibold text-slate-700">{t('wallets.balance')}</Label>
              <Controller
                control={control}
                name="balance"
                render={({ field }) => (
                  <NumberInput
                    id="balance"
                    value={field.value}
                    onValueChange={(val) => field.onChange(val === undefined ? 0 : val)}
                    placeholder="0.00"
                    className="h-10 border-slate-200 focus:ring-blue-500 transition-all"
                  />
                )}
              />
              {errors.balance && <p className="text-sm text-red-500">{errors.balance.message}</p>}
            </div>
          )}

          {wallet && (
            <div className="space-y-1.5">
              <Label htmlFor="is_active" className="font-semibold text-slate-700">{t('common.status')}</Label>
              <Select 
                value={isActive ? "active" : "inactive"} 
                onValueChange={(val) => setValue("is_active", val === "active", { shouldValidate: true })}
              >
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-10 px-4 rounded-md text-slate-600 hover:text-slate-900 border-slate-200 transition-colors">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm">
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
