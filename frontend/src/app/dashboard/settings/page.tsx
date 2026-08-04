"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSettings, updateSettings } from "@/lib/api/settings";

const formSchema = z.object({
  system_name: z.string().min(1, "System name is required"),
  default_currency: z.string().min(1, "Default currency is required"),
  business_name: z.string().min(1, "Business name is required"),
  business_address: z.string().min(1, "Business address is required"),
  business_phone: z.string().min(1, "Business phone is required"),
  receipt_footer: z.string().optional(),
  receipt_printer_width: z.string().min(1, "Receipt printer width is required"),
  dashboard_refresh_interval: z.string().min(1, "Refresh interval is required"),
  auto_backup_enabled: z.string().min(1, "Auto backup setting is required"),
  backup_retention_days: z.string().min(1, "Retention days is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      system_name: "Exchange Management System",
      default_currency: "MMK",
      business_name: "My Money Exchange",
      business_address: "123 Main St, Yangon",
      business_phone: "+95 9 123 456 789",
      receipt_footer: "Thank you for your business!",
      receipt_printer_width: "80mm",
      dashboard_refresh_interval: "300",
      auto_backup_enabled: "true",
      backup_retention_days: "30",
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getSettings();
        const values: Partial<FormValues> = {};
        
        settings.forEach((s) => {
          if (s.key in getValues()) {
            (values as any)[s.key] = s.value;
          }
        });
        
        reset({ ...getValues(), ...values });
      } catch (error) {
        console.error("Failed to fetch settings", error);
        alert("Warning: Could not load settings from server. Using defaults.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [reset, getValues]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const updates = Object.entries(values).map(([key, value]) => ({
        key,
        value: value as string,
      }));
      
      await updateSettings(updates);
      
      alert("Success: Settings updated successfully.");
    } catch (error) {
      alert("Error: Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Manage basic system configurations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">System Name</label>
                  <Input {...register("system_name")} />
                  {errors.system_name && (
                    <p className="text-[0.8rem] text-destructive">{errors.system_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Currency</label>
                  <Input {...register("default_currency")} />
                  {errors.default_currency && (
                    <p className="text-[0.8rem] text-destructive">{errors.default_currency.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Information used on reports and receipts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input {...register("business_name")} />
                  {errors.business_name && (
                    <p className="text-[0.8rem] text-destructive">{errors.business_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Address</label>
                  <Textarea {...register("business_address")} />
                  {errors.business_address && (
                    <p className="text-[0.8rem] text-destructive">{errors.business_address.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Phone</label>
                  <Input {...register("business_phone")} />
                  {errors.business_phone && (
                    <p className="text-[0.8rem] text-destructive">{errors.business_phone.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Settings</CardTitle>
                <CardDescription>
                  Configure thermal printer outputs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Printer Width</label>
                  <Input {...register("receipt_printer_width")} placeholder="e.g. 58mm or 80mm" />
                  {errors.receipt_printer_width && (
                    <p className="text-[0.8rem] text-destructive">{errors.receipt_printer_width.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Receipt Footer Text</label>
                  <Textarea {...register("receipt_footer")} />
                  {errors.receipt_footer && (
                    <p className="text-[0.8rem] text-destructive">{errors.receipt_footer.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Settings</CardTitle>
                <CardDescription>
                  Configure live monitoring defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-refresh Interval (Seconds)</label>
                  <Input type="number" {...register("dashboard_refresh_interval")} />
                  <p className="text-[0.8rem] text-muted-foreground">Set to 0 to disable auto-refresh.</p>
                  {errors.dashboard_refresh_interval && (
                    <p className="text-[0.8rem] text-destructive">{errors.dashboard_refresh_interval.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup Settings</CardTitle>
                <CardDescription>
                  Configure automated database backups.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enable Auto Backup</label>
                  <Input {...register("auto_backup_enabled")} placeholder="true or false" />
                  {errors.auto_backup_enabled && (
                    <p className="text-[0.8rem] text-destructive">{errors.auto_backup_enabled.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retention Period (Days)</label>
                  <Input type="number" {...register("backup_retention_days")} />
                  {errors.backup_retention_days && (
                    <p className="text-[0.8rem] text-destructive">{errors.backup_retention_days.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
