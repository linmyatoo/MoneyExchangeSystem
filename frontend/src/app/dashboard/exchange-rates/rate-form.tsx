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

const rateSchema = z.object({
  currency_code: z.string().min(1, "Required"),
  buy_rate: z.coerce.number().min(0.0001, "Rate must be > 0"),
  sell_rate: z.coerce.number().min(0.0001, "Rate must be > 0"),
  effective_date: z.string().min(1, "Required"),
});

type RateFormValues = z.infer<typeof rateSchema>;

interface RateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
}

export function RateForm({ open, onOpenChange, onSubmit }: RateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema) as any,
    defaultValues: {
      currency_code: "THB",
      buy_rate: 0,
      sell_rate: 0,
      effective_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        currency_code: "THB",
        buy_rate: 0,
        sell_rate: 0,
        effective_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: RateFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to publish rate", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-xl overflow-hidden p-0 border-none shadow-xl">
        <div className="px-5 py-5 border-b border-gray-100 bg-gray-50/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-gray-900">Publish New Exchange Rate</DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-5 py-5">
          
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700">Currency Code</Label>
            <Input {...register("currency_code")} readOnly className="bg-gray-100 border-gray-200 text-gray-500 shadow-none h-10" />
            <p className="text-xs text-gray-500">Currently only THB is supported</p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-blue-700">Buy Rate (THB per 100,000 MMK)</Label>
            <Input type="number" step="0.0001" {...register("buy_rate")} className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium text-base" />
            {errors.buy_rate && <p className="text-sm text-red-500 font-medium">{errors.buy_rate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-purple-700">Sell Rate (THB per 100,000 MMK)</Label>
            <Input type="number" step="0.0001" {...register("sell_rate")} className="h-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all font-medium text-base" />
            {errors.sell_rate && <p className="text-sm text-red-500 font-medium">{errors.sell_rate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700">Effective Date</Label>
            <Input type="date" {...register("effective_date")} className="h-10 border-gray-200" />
            {errors.effective_date && <p className="text-sm text-red-500 font-medium">{errors.effective_date.message}</p>}
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-10 px-4 rounded-md text-gray-600 hover:text-gray-900 border-gray-200">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-4 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm">
              {isSubmitting ? "Publishing..." : "Publish Rate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
