import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SoftCarrierSource = 'preislis' | 'artx' | 'tarifsb2b' | 'herstinfo' | 'lagerbestand';

// CP850 to Unicode mapping for special characters
const CP850_MAP: Record<number, string> = {
  128:'Ç',129:'ü',130:'é',131:'â',132:'ä',133:'à',134:'å',135:'ç',
  136:'ê',137:'ë',138:'è',139:'ï',140:'î',141:'ì',142:'Ä',143:'Å',
  144:'É',145:'æ',146:'Æ',147:'ô',148:'ö',149:'ò',150:'û',151:'ù',
  152:'ÿ',153:'Ö',154:'Ü',155:'ø',156:'£',157:'Ø',158:'×',159:'ƒ',
  160:'á',161:'í',162:'ó',163:'ú',164:'ñ',165:'Ñ',166:'ª',167:'º',
  168:'¿',169:'®',170:'¬',171:'½',172:'¼',173:'¡',174:'«',175:'»',
  176:'░',177:'▒',178:'▓',179:'│',180:'┤',181:'Á',182:'Â',183:'À',
  184:'©',185:'╣',186:'║',187:'╗',188:'╝',189:'¢',190:'¥',191:'┐',
  192:'└',193:'┴',194:'┬',195:'├',196:'─',197:'┼',198:'ã',199:'Ã',
  200:'╚',201:'╔',202:'╩',203:'╦',204:'╠',205:'═',206:'╬',207:'¤',
  208:'ð',209:'Ð',210:'Ê',211:'Ë',212:'È',213:'ı',214:'Í',215:'Î',
  216:'Ï',217:'┘',218:'┌',219:'█',220:'▄',221:'¦',222:'Ì',223:'▀',
  224:'Ó',225:'ß',226:'Ô',227:'Ò',228:'õ',229:'Õ',230:'µ',231:'þ',
  232:'Þ',233:'Ú',234:'Û',235:'Ù',236:'ý',237:'Ý',238:'¯',239:'´',
  240:'­',241:'±',242:'‗',243:'¾',244:'¶',245:'§',246:'÷',247:'¸',
  248:'°',249:'¨',250:'·',251:'¹',252:'³',253:'²',254:'■',255:' ',
};

function decodeCP850(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 128) {
      result += String.fromCharCode(b);
    } else {
      result += CP850_MAP[b] || String.fromCharCode(b);
    }
  }
  return result;
}

// Sources that use CP850 encoding
const CP850_SOURCES: SoftCarrierSource[] = ['herstinfo', 'preislis', 'artx'];


interface ImportResult {
  success: number;
  errors: number;
  skipped?: number;
  details?: string[];
}

export const useSoftCarrierImport = () => {
  const [importing, setImporting] = useState<SoftCarrierSource | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, ImportResult>>({});

  const importFile = async (source: SoftCarrierSource, file: File) => {
    setImporting(source);
    try {
      let data: string;
      
      if (CP850_SOURCES.includes(source)) {
        const buffer = await file.arrayBuffer();
        data = decodeCP850(buffer);
      } else {
        data = await file.text();
      }
      
      // Split large files into batches of ~2000 lines to avoid edge function timeouts
      const lines = data.split(/\r?\n/);
      const BATCH_LINES = 2000;
      const totals: ImportResult = { success: 0, errors: 0, skipped: 0, details: [] };

      if (lines.length > BATCH_LINES) {
        for (let i = 0; i < lines.length; i += BATCH_LINES) {
          const chunk = lines.slice(i, i + BATCH_LINES).join('\n');
          const { data: result, error } = await supabase.functions.invoke('import-softcarrier', {
            body: { source, data: chunk },
          });
          if (error) throw error;
          totals.success += result.success || 0;
          totals.errors += result.errors || 0;
          totals.skipped += result.skipped || 0;
          totals.details?.push(...(result.details || []));
        }
      } else {
        const { data: result, error } = await supabase.functions.invoke('import-softcarrier', {
          body: { source, data },
        });
        if (error) throw error;
        totals.success = result.success || 0;
        totals.errors = result.errors || 0;
        totals.skipped = result.skipped || 0;
        totals.details = result.details || [];
      }

      setLastResult(prev => ({ ...prev, [source]: totals }));
      
      if (totals.errors > 0) {
        toast.warning(`Import ${source} terminé avec erreurs`, {
          description: `${totals.success} succès, ${totals.errors} erreurs`,
        });
      } else {
        toast.success(`Import ${source} terminé`, {
          description: `${totals.success} éléments importés`,
        });
      }
      
      return totals;
    } catch (err) {
      toast.error(`Erreur import ${source}`, { description: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      setImporting(null);
    }
  };

  return { importFile, importing, lastResult };
};
