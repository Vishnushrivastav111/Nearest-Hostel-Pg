import { calculateCommissionAmount } from './commission.util';

describe('calculateCommissionAmount', () => {
  it('returns a fixed amount', () => {
    expect(calculateCommissionAmount({ monthlyRent: 8000, type: 'fixed', fixedAmount: 1000 })).toBe(
      1000,
    );
  });

  it('returns a percentage of rent', () => {
    expect(
      calculateCommissionAmount({ monthlyRent: 8000, type: 'percentage', percentage: 10 }),
    ).toBe(800);
  });
});
