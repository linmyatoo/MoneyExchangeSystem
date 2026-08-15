'use client';

import React from 'react';
import { useLanguage, Language } from '@/i18n/LanguageContext';
import { Globe, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
        <SelectTrigger className="w-[125px] h-9 text-xs font-medium border-gray-200 bg-white hover:bg-gray-50 focus:ring-1 focus:ring-blue-500">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <SelectValue placeholder={t('common.language')} />
          </div>
        </SelectTrigger>
        <SelectContent align="end" className="w-[140px] bg-white">
          <SelectItem value="en" className="text-xs flex items-center justify-between cursor-pointer py-2">
            <span className="flex items-center gap-2 font-medium">
              <span className="text-sm">🇺🇸</span> English
            </span>
          </SelectItem>
          <SelectItem value="my" className="text-xs flex items-center justify-between cursor-pointer py-2">
            <span className="flex items-center gap-2 font-medium">
              <span className="text-sm">🇲🇲</span> မြန်မာ
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
