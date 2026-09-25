import { ConflictException, Injectable } from '@nestjs/common';

export const pakistanPaymentMethods = ['BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH'] as const;
export type PakistanPaymentMethod = typeof pakistanPaymentMethods[number];
export const SUBSCRIPTION_PAYMENT_PROVIDER = 'SUBSCRIPTION_PAYMENT_PROVIDER';

export interface SubscriptionPaymentProvider {
  readonly key: string;
  paymentInstructions(): Array<{ method: PakistanPaymentMethod; label: string; instructions: string | null; configured: boolean }>;
  requireConfigured(method: PakistanPaymentMethod): string;
}

@Injectable()
export class PakistanManualPaymentProvider implements SubscriptionPaymentProvider {
  readonly key = 'PAKISTAN_MANUAL';
  private readonly instructions: Record<PakistanPaymentMethod, string | undefined> = {
    BANK_TRANSFER: process.env.SUBSCRIPTION_BANK_TRANSFER_INSTRUCTIONS,
    EASYPAISA: process.env.SUBSCRIPTION_EASYPAISA_INSTRUCTIONS,
    JAZZCASH: process.env.SUBSCRIPTION_JAZZCASH_INSTRUCTIONS,
  };

  paymentInstructions() {
    return pakistanPaymentMethods.map((method) => ({
      method,
      label: method === 'BANK_TRANSFER' ? 'Bank transfer' : method === 'EASYPAISA' ? 'Easypaisa' : 'JazzCash',
      instructions: this.instructions[method] ?? null,
      configured: Boolean(this.instructions[method]?.trim()),
    }));
  }

  requireConfigured(method: PakistanPaymentMethod) {
    const instructions = this.instructions[method]?.trim();
    if (!instructions) throw new ConflictException('Payment instructions are not configured for this method');
    return instructions;
  }
}
