import { describe, it, expect, beforeEach } from 'vitest';
import { usePriceModeStore } from './priceModeStore';

describe('priceModeStore', () => {
  beforeEach(() => {
    usePriceModeStore.setState({ mode: 'ttc' });
  });

  it('defaults to TTC mode', () => {
    expect(usePriceModeStore.getState().mode).toBe('ttc');
  });

  describe('toggle', () => {
    it('switches from TTC to HT', () => {
      usePriceModeStore.getState().toggle();
      expect(usePriceModeStore.getState().mode).toBe('ht');
    });

    it('switches from HT back to TTC', () => {
      usePriceModeStore.getState().toggle();
      usePriceModeStore.getState().toggle();
      expect(usePriceModeStore.getState().mode).toBe('ttc');
    });
  });

  describe('setMode', () => {
    it('sets mode to HT', () => {
      usePriceModeStore.getState().setMode('ht');
      expect(usePriceModeStore.getState().mode).toBe('ht');
    });

    it('sets mode to TTC', () => {
      usePriceModeStore.setState({ mode: 'ht' });
      usePriceModeStore.getState().setMode('ttc');
      expect(usePriceModeStore.getState().mode).toBe('ttc');
    });
  });
});
