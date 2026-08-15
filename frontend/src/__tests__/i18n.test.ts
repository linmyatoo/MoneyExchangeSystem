import { describe, it, expect } from 'vitest';
import { en } from '../i18n/translations/en';
import { my } from '../i18n/translations/my';

describe('i18n translations', () => {
  it('should have matching keys in English and Myanmar dictionaries', () => {
    const enSections = Object.keys(en);
    const mySections = Object.keys(my);

    expect(mySections).toEqual(enSections);

    for (const section of enSections) {
      const enKeys = Object.keys((en as any)[section]);
      const myKeys = Object.keys((my as any)[section]);
      expect(myKeys).toEqual(enKeys);
    }
  });

  it('should translate core common labels in English and Myanmar', () => {
    expect(en.common.save).toBe('Save');
    expect(my.common.save).toBe('သိမ်းဆည်းမည်');

    expect(en.common.english).toBe('English');
    expect(my.common.myanmar).toBe('မြန်မာ');
  });

  it('should translate navigation items in Myanmar', () => {
    expect(my.nav.dashboard).toBe('ဒက်ရှ်ဘုတ်');
    expect(my.nav.transactions).toBe('ငွေလွှဲပြောင်းမှုများ');
    expect(my.nav.credits).toBe('ကြွေးကျန်များ');
    expect(my.nav.thb_exchange).toBe('ဘတ်ငွေလဲလှယ်ရေး');
    expect(my.nav.exchange_rates).toBe('ငွေလဲနှုန်းများ');
  });
});
