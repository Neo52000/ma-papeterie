import { describe, it, expect } from 'vitest';
import { parseComlandiFile } from './comlandi-parser';

function createCsvFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('parseComlandiFile', () => {
  it('parses a valid CSV with semicolons', async () => {
    const csv = 'code;référence;description;prix\nABC;REF1;Stylo bleu;2.50\nDEF;REF2;Cahier;5.00';
    const result = await parseComlandiFile(createCsvFile(csv));

    expect(result.totalRows).toBe(2);
    expect(result.rows[0].code).toBe('ABC');
    expect(result.rows[0].reference).toBe('REF1');
    expect(result.rows[0].description).toBe('Stylo bleu');
    expect(result.rows[0].prix).toBe('2.50');
  });

  it('maps accented headers correctly', async () => {
    const csv = 'Référence;Catégorie;Description\nREF1;Ecriture;Stylo';
    const result = await parseComlandiFile(createCsvFile(csv));

    expect(result.mappedHeaders).toContainEqual({ original: 'Référence', mapped: 'reference' });
    expect(result.mappedHeaders).toContainEqual({ original: 'Catégorie', mapped: 'categorie' });
  });

  it('reports unmapped headers', async () => {
    const csv = 'code;unknown_col\nABC;foo';
    const result = await parseComlandiFile(createCsvFile(csv));

    expect(result.unmappedHeaders).toContain('unknown_col');
    expect(result.headers).toContain('code');
    expect(result.headers).not.toContain('unknown_col');
  });

  it('throws on empty file', async () => {
    const csv = '';
    await expect(parseComlandiFile(createCsvFile(csv))).rejects.toThrow();
  });

  it('throws on header-only file', async () => {
    const csv = 'code;reference';
    await expect(parseComlandiFile(createCsvFile(csv))).rejects.toThrow();
  });

  it('strips BOM from CSV', async () => {
    const csv = '\uFEFFcode;description\nABC;Test';
    const result = await parseComlandiFile(createCsvFile(csv));
    expect(result.rows[0].code).toBe('ABC');
  });

  it('handles Windows line endings', async () => {
    const csv = 'code;description\r\nABC;Test\r\nDEF;Test2';
    const result = await parseComlandiFile(createCsvFile(csv));
    expect(result.totalRows).toBe(2);
  });
});
