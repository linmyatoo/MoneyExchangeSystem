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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Publish New Exchange Rate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          
          <div className="space-y-2">
            <Label>Currency Code</Label>
            <Input {...register("currency_code")} readOnly className="bg-gray-100" />
            <p className="text-xs text-gray-500">Currently only THB is supported</p>
          </div>

          <div className="space-y-2">
            <Label>Buy Rate (THB per 100,000 MMK)</Label>
            <Input type="number" step="0.0001" {...register("buy_rate")} />
            {errors.buy_rate && <p className="text-sm text-red-500">{errors.buy_rate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Sell Rate (THB per 100,000 MMK)</Label>
            <Input type="number" step="0.0001" {...register("sell_rate")} />
            {errors.sell_rate && <p className="text-sm text-red-500">{errors.sell_rate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input type="date" {...register("effective_date")} />
            {errors.effective_date && <p className="text-sm text-red-500">{errors.effective_date.message}</p>}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Publishing..." : "Publish Rate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
