import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportLogs, ImportLog } from '@/hooks/useImportLogs';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileSpreadsheet, 
  FileCode, 
  FileJson, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Clock
} from 'lucide-react';

interface ImportLogsHistoryProps {
  supplierId?: string;
}

export function ImportLogsHistory({ supplierId }: ImportLogsHistoryProps) {
  const { logs, loading, refetch } = useImportLogs(supplierId);
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null);

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'xml':
        return <FileCode className="h-4 w-4" />;
      case 'json':
        return <FileJson className="h-4 w-4" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (log: ImportLog) => {
    const successRate = log.total_rows && log.total_rows > 0 
      ? ((log.success_count || 0) / log.total_rows) * 100 
      : 0;

    if (successRate >= 90) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Succès
        </Badge>
      );
    } else if (successRate >= 50) {
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-white">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Partiel
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Échec
        </Badge>
      );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: fr 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Chargement de l'historique...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des imports
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun import enregistré</p>
              <p className="text-sm mt-2">
                Les imports apparaîtront ici après leur exécution
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {!supplierId && <TableHead>Fournisseur</TableHead>}
                  <TableHead>Format</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Succès</TableHead>
                  <TableHead className="text-center">Erreurs</TableHead>
                  <TableHead className="text-center">Non matchés</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.imported_at)}
                    </TableCell>
                    {!supplierId && (
                      <TableCell className="font-medium">
                        {log.supplier_name}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getFormatIcon(log.format)}
                        {log.format.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {log.filename || 'N/A'}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {log.total_rows || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600 font-medium">
                        {log.success_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={log.error_count && log.error_count > 0 ? 'text-red-600 font-medium' : ''}>
                        {log.error_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={log.unmatched_count && log.unmatched_count > 0 ? 'text-yellow-600 font-medium' : ''}>
                        {log.unmatched_count || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log)}
                    </TableCell>
                    <TableCell>
                      {log.errors && log.errors.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Détails des erreurs
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fichier: </span>
                  <span className="font-medium">{selectedLog.filename}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Format: </span>
                  <span className="font-medium">{selectedLog.format.toUpperCase()}</span>
                </div>
              </div>
              
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {selectedLog.errors && selectedLog.errors.map((error: any, index: number) => (
                  <div key={index} className="p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        {error.row !== undefined && (
                          <span className="text-muted-foreground">Ligne {error.row}: </span>
                        )}
                        <span>{error.message || error.error || JSON.stringify(error)}</span>
                        {error.reference && (
                          <div className="text-muted-foreground mt-1">
                            Référence: {error.reference}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
