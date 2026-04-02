import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SoftCarrierPreviewProps {
  rows: Record<string, string>[];
  columns: string[];
  maxRows?: number;
  totalRows: number;
}

export function SoftCarrierPreview({ rows, columns, maxRows = 10, totalRows }: SoftCarrierPreviewProps) {
  const preview = rows.slice(0, maxRows);

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-auto max-h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(h => (
                <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((row, i) => (
              <TableRow key={i}>
                {columns.map(h => (
                  <TableCell key={h} className="text-xs max-w-[200px] truncate">
                    {row[h] || '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Aperçu des {Math.min(maxRows, preview.length)} premières lignes sur {totalRows}
      </p>
    </div>
  );
}
