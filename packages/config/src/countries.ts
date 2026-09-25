export const countries = {
  PK: { name: 'Pakistan', currency: 'PKR', timezone: 'Asia/Karachi', phonePrefix: '+92', dateFormat: 'dd/MM/yyyy', rentalPaymentMethods: ['CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH'] },
  GB: { name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', phonePrefix: '+44', dateFormat: 'dd/MM/yyyy', rentalPaymentMethods: ['CASH', 'BANK_TRANSFER'] },
  AE: { name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', phonePrefix: '+971', dateFormat: 'dd/MM/yyyy', rentalPaymentMethods: ['CASH', 'BANK_TRANSFER'] },
  US: { name: 'United States', currency: 'USD', timezone: 'America/New_York', phonePrefix: '+1', dateFormat: 'MM/dd/yyyy', rentalPaymentMethods: ['CASH', 'BANK_TRANSFER'] },
} as const;
export type CountryCode = keyof typeof countries;
