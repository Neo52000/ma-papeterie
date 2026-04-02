import { RefreshCw, Package } from 'lucide-react';
import { useProductUpdateKpi, type SupplierDailyUpdate } from '@/hooks/admin/useProductUpdateKpi';

const SUPPLIER_COLORS: Record<string, string> = {
  COMLANDI: '#F59E0B',
  ALKOR: '#3B82F6',
  SOFT: '#10B981',
};

const SUPPLIER_LABELS: Record<string, string> = {
  COMLANDI: 'Comlandi',
  ALKOR: 'Alkor',
  SOFT: 'Soft Carrier',
};

const COLUMNS = [
  { key: 'stock_changes' as const, label: 'Stock' },
  { key: 'new_articles' as const, label: 'Nouveaux' },
  { key: 'deactivated' as const, label: 'Désactivés' },
  { key: 'price_changes' as const, label: 'Prix' },
];

function formatCell(value: number): string {
  return value > 0 ? value.toLocaleString('fr-FR') : '—';
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-8 rounded-lg animate-pulse"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
      ))}
    </>
  );
}

export function ProductUpdateWidget() {
  const { data, isLoading, error } = useProductUpdateKpi();

  const totals = (data ?? []).reduce(
    (acc, row) => ({
      stock_changes: acc.stock_changes + row.stock_changes,
      new_articles: acc.new_articles + row.new_articles,
      deactivated: acc.deactivated + row.deactivated,
      price_changes: acc.price_changes + row.price_changes,
    }),
    { stock_changes: 0, new_articles: 0, deactivated: 0, price_changes: 0 },
  );

  const hasData = data && data.some(
    (r) => r.stock_changes > 0 || r.new_articles > 0 || r.deactivated > 0 || r.price_changes > 0,
  );

  return (
    <div
      className="kpi-card-enter rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(255, 255, 255, 0.03))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: '600ms',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" style={{ color: '#3B82F6' }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
          >
            Mises à jour produits
          </h3>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}
        >
          Aujourd'hui
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs" style={{ color: '#EF4444' }}>
          Erreur : {(error as Error).message}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          <SkeletonRows />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && !hasData && (
        <div className="flex flex-col items-center justify-center py-6">
          <Package className="h-8 w-8 mb-2" style={{ color: '#374151' }} />
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Aucune mise à jour aujourd'hui
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && hasData && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left pb-2" />
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="text-right pb-2 px-2"
                    style={{
                      color: '#6B7280',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '10px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row: SupplierDailyUpdate) => {
                const color = SUPPLIER_COLORS[row.supplier_code] ?? '#9CA3AF';
                const label = SUPPLIER_LABELS[row.supplier_code] ?? row.supplier_name;
                return (
                  <tr key={row.supplier_code} className="group">
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                        />
                        <span
                          className="text-xs font-medium whitespace-nowrap"
                          style={{ color: '#F9FAFB' }}
                        >
                          {label}
                        </span>
                      </div>
                    </td>
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className="text-right py-1.5 px-2"
                        style={{
                          fontFamily: "'DM Mono', 'Space Mono', monospace",
                          fontSize: '13px',
                          color: row[col.key] > 0 ? '#F9FAFB' : '#4B5563',
                        }}
                      >
                        {formatCell(row[col.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  className="pt-2 pr-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: '#D1D5DB' }}
                  >
                    Total
                  </span>
                </td>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="text-right pt-2 px-2"
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      fontFamily: "'DM Mono', 'Space Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 700,
                      color: totals[col.key] > 0 ? '#F9FAFB' : '#4B5563',
                    }}
                  >
                    {formatCell(totals[col.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
