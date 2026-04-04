import { describe, it, expect } from 'vitest';
import {
  MINIMUM_MARGIN_PERCENT,
  calculateMargin,
  minimumSellingPrice,
  isMarginValid,
} from './margin';

describe('margin', () => {
  describe('MINIMUM_MARGIN_PERCENT', () => {
    it('is 10%', () => {
      expect(MINIMUM_MARGIN_PERCENT).toBe(10);
    });
  });

  describe('calculateMargin', () => {
    it('returns correct margin for normal values', () => {
      // (100 - 80) / 100 * 100 = 20%
      expect(calculateMargin(100, 80)).toBeCloseTo(20);
    });

    it('returns 0 when priceHt is 0', () => {
      expect(calculateMargin(0, 50)).toBe(0);
    });

    it('returns 0 when priceHt is negative', () => {
      expect(calculateMargin(-10, 5)).toBe(0);
    });

    it('returns 100% when costPrice is 0', () => {
      expect(calculateMargin(50, 0)).toBeCloseTo(100);
    });

    it('returns negative margin when selling below cost', () => {
      // (50 - 80) / 50 * 100 = -60%
      expect(calculateMargin(50, 80)).toBeCloseTo(-60);
    });

    it('returns exactly 10% for the minimum margin threshold', () => {
      // (100 - 90) / 100 * 100 = 10%
      expect(calculateMargin(100, 90)).toBeCloseTo(10);
    });
  });

  describe('minimumSellingPrice', () => {
    it('calculates minimum price with default 10% margin', () => {
      // costPrice / (1 - 10/100) = 80 / 0.9 ≈ 88.89
      expect(minimumSellingPrice(80)).toBeCloseTo(88.89, 1);
    });

    it('calculates minimum price with custom margin', () => {
      // 80 / (1 - 20/100) = 80 / 0.8 = 100
      expect(minimumSellingPrice(80, 20)).toBeCloseTo(100);
    });

    it('returns costPrice when margin is 0%', () => {
      expect(minimumSellingPrice(50, 0)).toBeCloseTo(50);
    });

    it('returns 0 when costPrice is 0', () => {
      expect(minimumSellingPrice(0)).toBeCloseTo(0);
    });
  });

  describe('isMarginValid', () => {
    it('returns true when margin is above minimum', () => {
      // margin = (100 - 80) / 100 = 20% > 10%
      expect(isMarginValid(100, 80)).toBe(true);
    });

    it('returns true when margin equals exactly minimum', () => {
      // margin = (100 - 90) / 100 = 10% === 10%
      expect(isMarginValid(100, 90)).toBe(true);
    });

    it('returns false when margin is below minimum', () => {
      // margin = (100 - 95) / 100 = 5% < 10%
      expect(isMarginValid(100, 95)).toBe(false);
    });

    it('returns false when selling at cost (0% margin)', () => {
      expect(isMarginValid(100, 100)).toBe(false);
    });

    it('returns false when selling below cost (negative margin)', () => {
      expect(isMarginValid(50, 80)).toBe(false);
    });

    it('works with custom minimum margin', () => {
      // margin = (100 - 80) / 100 = 20% >= 25%? No
      expect(isMarginValid(100, 80, 25)).toBe(false);
      // margin = 20% >= 15%? Yes
      expect(isMarginValid(100, 80, 15)).toBe(true);
    });
  });
});
