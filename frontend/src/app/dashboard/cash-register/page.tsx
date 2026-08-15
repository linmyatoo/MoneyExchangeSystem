"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/i18n/LanguageContext";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Banknote,
  FileText,
  Clock,
  Coins,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  getDailyStatus,
  openRegister,
  closeRegister,
  updateOpening,
  updateClosing,
  DailyStatusResponse,
} from "@/lib/api/cash-management";

const openSchema = z.object({
  mmk_amount: z.coerce.number().min(0, "Amount cannot be negative"),
  thb_amount: z.coerce.number().min(0, "Amount cannot be negative"),
  notes: z.string().optional(),
});

const closeSchema = z.object({
  mmk_amount: z.coerce.number().min(0, "Amount cannot be negative"),
  thb_amount: z.coerce.number().min(0, "Amount cannot be negative"),
  notes: z.string().optional(),
});

export default function CashRegisterPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [status, setStatus] = useState<DailyStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [isEditingClosing, setIsEditingClosing] = useState(false);

  useEffect(() => {
    if (user?.role?.name === "staff") {
      router.push("/dashboard/wallet-transactions");
      return;
    }
  }, [user, router]);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyStatus();
      setStatus(data);

      if (data.opening) {
        openForm.reset({
          mmk_amount: data.opening.mmk_amount,
          thb_amount: data.opening.thb_amount,
          notes: data.opening.notes || "",
        });
      }
      if (data.closing) {
        closeForm.reset({
          mmk_amount: data.closing.mmk_amount,
          thb_amount: data.closing.thb_amount,
          notes: data.closing.notes || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch daily status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const openForm = useForm({
    resolver: zodResolver(openSchema),
    defaultValues: {
      mmk_amount: 0,
      thb_amount: 0,
      notes: "",
    },
  });

  const closeForm = useForm({
    resolver: zodResolver(closeSchema),
    defaultValues: {
      mmk_amount: 0,
      thb_amount: 0,
      notes: "",
    },
  });

  const watchedCloseMMK = useWatch({ control: closeForm.control, name: "mmk_amount" }) || 0;
  const watchedCloseTHB = useWatch({ control: closeForm.control, name: "thb_amount" }) || 0;

  const expectedMMK = status?.expected_mmk_now ?? status?.closing?.expected_mmk_amount ?? 0;
  const expectedTHB = status?.expected_thb_now ?? status?.closing?.expected_thb_amount ?? 0;

  const mmkDiff = (Number(watchedCloseMMK) || 0) - expectedMMK;
  const thbDiff = (Number(watchedCloseTHB) || 0) - expectedTHB;

  const onOpenSubmit = async (data: any) => {
    try {
      if (isEditingOpening && status?.opening) {
        await updateOpening(status.opening.id, data);
        setIsEditingOpening(false);
      } else {
        await openRegister(data);
      }
      fetchStatus();
    } catch (error) {
      console.error("Failed to open register:", error);
    }
  };

  const onCloseSubmit = async (data: any) => {
    try {
      if (isEditingClosing && status?.closing) {
        await updateClosing(status.closing.id, data);
        setIsEditingClosing(false);
      } else {
        await closeRegister(data);
      }
      fetchStatus();
    } catch (error) {
      console.error("Failed to close register:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
          <Coins className="w-5 h-5 text-indigo-600 absolute" />
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-md mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-rose-900">{t('common.error')}</h3>
        <Button onClick={fetchStatus} size="sm" variant="outline" className="border-rose-300 text-rose-800 hover:bg-rose-100">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                <Banknote className="w-6 h-6 text-indigo-300" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{t('cash_register.title')}</h1>
            <p className="text-slate-300 text-sm max-w-lg">
              {t('cash_register.desc')}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link href="/dashboard/cash-register/history">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all shadow-sm">
                <FileText className="w-4 h-4 mr-2 text-indigo-300" /> {t('cash_register.history')}
              </Button>
            </Link>
            <Button onClick={fetchStatus} size="icon" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* STATE 1: REGISTER NOT OPENED */}
      {status.status === "NOT_OPENED" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-8 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-amber-100" />
              <span className="font-bold text-sm tracking-wide uppercase">{t('cash_register.status_closed')}</span>
            </div>
          </div>

          <div className="p-8 md:p-10 grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-12 bg-slate-50/70 border border-slate-200/60 rounded-2xl p-6 sm:p-8">
              <form onSubmit={openForm.handleSubmit(onOpenSubmit)} className="space-y-5">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <Sparkles className="w-5 h-5 text-indigo-600 mr-2" /> {t('cash_register.open_register')}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                      {t('cash_register.opening_balance')} (MMK 🇲🇲)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="bg-white px-4 py-3 text-lg font-semibold text-slate-800 border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl"
                      {...openForm.register("mmk_amount")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                      {t('cash_register.opening_balance')} (THB 🇹🇭)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="bg-white px-4 py-3 text-lg font-semibold text-slate-800 border-slate-200 focus:ring-2 focus:ring-purple-500 rounded-xl"
                      {...openForm.register("thb_amount")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                    {t('common.note')}
                  </Label>
                  <Textarea
                    placeholder="..."
                    className="bg-white border-slate-200 rounded-xl text-sm"
                    rows={2}
                    {...openForm.register("notes")}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
                  disabled={openForm.formState.isSubmitting}
                >
                  {openForm.formState.isSubmitting ? t('common.loading') : t('cash_register.open_register')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: REGISTER OPEN */}
      {status.status === "OPEN" && status.opening && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-emerald-200/80 shadow-lg overflow-hidden p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{t('cash_register.session_active')}</h2>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">{t('cash_register.status_open')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase text-slate-500">{t('cash_register.expected_balance')} (MMK)</span>
                <div className="text-3xl font-extrabold text-slate-900">
                  {new Intl.NumberFormat("en-US").format(status.expected_mmk_now || 0)} K
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase text-slate-500">{t('cash_register.expected_balance')} (THB)</span>
                <div className="text-3xl font-extrabold text-purple-900">
                  {new Intl.NumberFormat("en-US").format(status.expected_thb_now || 0)} ฿
                </div>
              </div>
            </div>

            <form onSubmit={closeForm.handleSubmit(onCloseSubmit)} className="space-y-6 pt-4 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{t('cash_register.close_register')}</h3>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-700">{t('cash_register.closing_balance')} (MMK)</Label>
                  <Input type="number" step="0.01" className="bg-white py-3 text-lg font-bold rounded-xl" {...closeForm.register("mmk_amount")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-700">{t('cash_register.closing_balance')} (THB)</Label>
                  <Input type="number" step="0.01" className="bg-white py-3 text-lg font-bold rounded-xl" {...closeForm.register("thb_amount")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-700">{t('common.note')}</Label>
                <Textarea className="border-slate-200 rounded-xl text-sm" rows={2} {...closeForm.register("notes")} />
              </div>

              <Button type="submit" size="lg" variant="destructive" className="w-full font-bold py-3 rounded-xl" disabled={closeForm.formState.isSubmitting}>
                {closeForm.formState.isSubmitting ? t('common.loading') : t('cash_register.close_register')}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* STATE 3: REGISTER CLOSED */}
      {status.status === "CLOSED" && status.closing && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-8 space-y-6">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('cash_register.status_closed')}</h2>
              <p className="text-xs text-slate-500">{status.closing.closing_date}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
