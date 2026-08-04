"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, CheckCircle2, Lock, Unlock, Banknote, FileText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  getDailyStatus,
  openRegister,
  closeRegister,
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
  const router = useRouter();
  const [status, setStatus] = useState<DailyStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [isEditingClosing, setIsEditingClosing] = useState(false);

  useEffect(() => {
    if (user?.role.name === "staff") {
      router.push("/dashboard/wallet-transactions");
      return;
    }
  }, [user, router]);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyStatus();
      setStatus(data);
      
      // Pre-fill edit forms with current data
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

  const onOpenSubmit = async (data: any) => {
    try {
      if (isEditingOpening && status?.opening) {
        // Use the updateOpening API (requires importing updateOpening)
        const { updateOpening } = await import("@/lib/api/cash-management");
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
        const { updateClosing } = await import("@/lib/api/cash-management");
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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!status) return <div>Failed to load cash register status.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Cash Register</h1>
          <p className="text-slate-300 mt-1 text-sm">Manage your shift's physical cash drawer and inventory</p>
        </div>
        <Link href="/dashboard/cash-register/history">
          <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 transition-colors">
            <FileText className="w-4 h-4 mr-2" /> Shift History
          </Button>
        </Link>
      </div>

      {status.status === "NOT_OPENED" && (
        <div className="rounded-2xl border-0 bg-gradient-to-b from-orange-50 to-white text-card-foreground shadow-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500"></div>
          <div className="flex flex-col items-center justify-center mb-8 text-orange-600">
            <div className="bg-orange-100 p-4 rounded-full mb-4 shadow-inner animate-pulse">
              <Lock className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Register is Closed</h2>
          </div>
          <p className="text-center text-slate-600 mb-10 max-w-md mx-auto leading-relaxed">
            Please count the physical cash currently in the drawer and open the register to begin today's shift.
          </p>

          <form onSubmit={openForm.handleSubmit(onOpenSubmit)} className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <Label>Opening MMK (Physical Cash)</Label>
              <Input type="number" step="0.01" {...openForm.register("mmk_amount")} />
              {openForm.formState.errors.mmk_amount && (
                <p className="text-sm text-red-500">{String(openForm.formState.errors.mmk_amount.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Opening THB (Physical Cash)</Label>
              <Input type="number" step="0.01" {...openForm.register("thb_amount")} />
              {openForm.formState.errors.thb_amount && (
                <p className="text-sm text-red-500">{String(openForm.formState.errors.thb_amount.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea {...openForm.register("notes")} />
            </div>

            <Button type="submit" className="w-full" disabled={openForm.formState.isSubmitting}>
              {openForm.formState.isSubmitting ? "Opening..." : "Open Register"}
            </Button>
          </form>
        </div>
      )}

      {status.status === "OPEN" && status.opening && (
        <div className="space-y-6">
          <div className="rounded-2xl border-0 bg-gradient-to-r from-emerald-50 to-teal-50 text-card-foreground shadow-md p-6 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-500"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5 text-emerald-800">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <Unlock className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Register is Open</h2>
                  <p className="text-sm text-slate-600 mt-0.5">Opened by <span className="font-medium text-slate-800">{status.opening.creator.full_name}</span> at {new Date(status.opening.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingOpening(!isEditingOpening)}>
                {isEditingOpening ? "Cancel Edit" : "Edit Opening Amount"}
              </Button>
            </div>
            
            {isEditingOpening && (
              <div className="mt-6 pt-6 border-t border-green-200">
                <form onSubmit={openForm.handleSubmit(onOpenSubmit)} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Opening MMK</Label>
                    <Input type="number" step="0.01" {...openForm.register("mmk_amount")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Opening THB</Label>
                    <Input type="number" step="0.01" {...openForm.register("thb_amount")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea {...openForm.register("notes")} />
                  </div>
                  <Button type="submit" className="w-full">Save Changes</Button>
                </form>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 p-8">
              <h3 className="font-semibold text-lg mb-6 flex items-center text-slate-800">
                <div className="bg-blue-50 p-2 rounded-lg mr-3">
                  <Banknote className="w-5 h-5 text-blue-600" />
                </div>
                Expected Ledger Balances
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Expected MMK Cash</p>
                  <p className="text-2xl font-bold">{new Intl.NumberFormat("en-US").format(status.expected_mmk_now || 0)} K</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected THB Inventory</p>
                  <p className="text-2xl font-bold text-purple-600">{new Intl.NumberFormat("en-US").format(status.expected_thb_now || 0)} THB</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 p-8">
              <h3 className="font-semibold text-lg mb-2 text-rose-600 flex items-center">
                Close Shift
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Count the physical drawer and enter the actual amounts to close the shift.
              </p>
              <form onSubmit={closeForm.handleSubmit(onCloseSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Actual MMK Count</Label>
                  <Input type="number" step="0.01" {...closeForm.register("mmk_amount")} />
                  {closeForm.formState.errors.mmk_amount && (
                    <p className="text-sm text-red-500">{String(closeForm.formState.errors.mmk_amount.message)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Actual THB Count</Label>
                  <Input type="number" step="0.01" {...closeForm.register("thb_amount")} />
                  {closeForm.formState.errors.thb_amount && (
                    <p className="text-sm text-red-500">{String(closeForm.formState.errors.thb_amount.message)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Discrepancy Notes</Label>
                  <Textarea {...closeForm.register("notes")} placeholder="Explain any missing/extra cash..." />
                </div>

                <Button type="submit" variant="destructive" className="w-full" disabled={closeForm.formState.isSubmitting}>
                  {closeForm.formState.isSubmitting ? "Closing..." : "Close Register"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {status.status === "CLOSED" && status.closing && (
        <div className="rounded-2xl border-0 bg-gradient-to-br from-blue-50 via-white to-slate-50 text-card-foreground shadow-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-5 text-blue-800">
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800">Shift is Closed</h2>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setIsEditingOpening(!isEditingOpening)} className="bg-white/80 hover:bg-white text-slate-700">
                {isEditingOpening ? "Cancel Edit Opening" : "Edit Opening Amount"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditingClosing(!isEditingClosing)} className="bg-white/80 hover:bg-white text-blue-700 border-blue-200">
                {isEditingClosing ? "Cancel Edit Closing" : "Edit Closing Amount"}
              </Button>
            </div>
          </div>
          
          {isEditingClosing && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="font-semibold text-lg mb-4">Edit Closing Amounts</h3>
              <form onSubmit={closeForm.handleSubmit(onCloseSubmit)} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Actual MMK Count</Label>
                  <Input type="number" step="0.01" {...closeForm.register("mmk_amount")} />
                </div>
                <div className="space-y-2">
                  <Label>Actual THB Count</Label>
                  <Input type="number" step="0.01" {...closeForm.register("thb_amount")} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...closeForm.register("notes")} />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Save Changes</Button>
              </form>
            </div>
          )}
          <div className="max-w-2xl mx-auto space-y-6">
            {isEditingOpening && (
              <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                <h3 className="font-semibold text-lg mb-4 text-green-700">Edit Opening Amounts</h3>
                <form onSubmit={openForm.handleSubmit(onOpenSubmit)} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Opening MMK</Label>
                    <Input type="number" step="0.01" {...openForm.register("mmk_amount")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Opening THB</Label>
                    <Input type="number" step="0.01" {...openForm.register("thb_amount")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea {...openForm.register("notes")} />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Save Opening Changes</Button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
              <div>
                <p className="text-muted-foreground">Closing Date</p>
                <p className="font-medium">{status.closing.closing_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Closed By</p>
                <p className="font-medium">{status.closing.creator.full_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-muted-foreground mb-1">Expected MMK</p>
                <p className="font-semibold">{new Intl.NumberFormat("en-US").format(status.closing.expected_mmk_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Actual MMK</p>
                <p className="font-semibold">{new Intl.NumberFormat("en-US").format(status.closing.mmk_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">MMK Discrepancy</p>
                <p className={`font-bold ${status.closing.mmk_discrepancy < 0 ? 'text-red-500' : status.closing.mmk_discrepancy > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                  {status.closing.mmk_discrepancy > 0 ? '+' : ''}{new Intl.NumberFormat("en-US").format(status.closing.mmk_discrepancy)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
              <div>
                <p className="text-muted-foreground mb-1">Expected THB</p>
                <p className="font-semibold text-purple-600">{new Intl.NumberFormat("en-US").format(status.closing.expected_thb_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Actual THB</p>
                <p className="font-semibold text-purple-600">{new Intl.NumberFormat("en-US").format(status.closing.thb_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">THB Discrepancy</p>
                <p className={`font-bold ${status.closing.thb_discrepancy < 0 ? 'text-red-500' : status.closing.thb_discrepancy > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                  {status.closing.thb_discrepancy > 0 ? '+' : ''}{new Intl.NumberFormat("en-US").format(status.closing.thb_discrepancy)}
                </p>
              </div>
            </div>

            {status.closing.notes && (
              <div className="bg-gray-50 p-4 rounded-md mt-6">
                <p className="text-sm font-medium mb-1">Closing Notes:</p>
                <p className="text-sm text-gray-600">{status.closing.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
