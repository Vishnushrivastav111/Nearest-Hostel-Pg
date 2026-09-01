import { CommissionCalculationInput } from '../models/commission.model';

export function calculateCommissionAmount(input: CommissionCalculationInput): number {
  if (input.monthlyRent < 0) {
    throw new Error('Monthly rent cannot be negative.');
  }

  if (input.type === 'fixed') {
    const amount = input.fixedAmount ?? 0;
    if (amount < 0) {
      throw new Error('Commission amount cannot be negative.');
    }
    return roundCurrency(amount);
  }

  const percentage = input.percentage ?? 0;
  if (percentage < 0 || percentage > 100) {
    throw new Error('Commission percentage must be between 0 and 100.');
  }
  return roundCurrency((input.monthlyRent * percentage) / 100);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
