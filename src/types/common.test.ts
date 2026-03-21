import { describe, it, expect } from 'vitest';
import { toAppError } from './common';

describe('toAppError', () => {
  it('converts Error instances', () => {
    const err = new Error('Something broke');
    expect(toAppError(err)).toEqual({ message: 'Something broke' });
  });

  it('converts string errors', () => {
    expect(toAppError('network failure')).toEqual({ message: 'network failure' });
  });

  it('converts unknown values', () => {
    expect(toAppError(42)).toEqual({ message: 'Erreur inconnue' });
    expect(toAppError(null)).toEqual({ message: 'Erreur inconnue' });
    expect(toAppError(undefined)).toEqual({ message: 'Erreur inconnue' });
  });
});
