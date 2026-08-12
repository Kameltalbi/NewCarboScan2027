import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBuildings, useMeters, useCreateReading } from './hooks';
import { useOrgCurrency } from './useOrgCurrency';
import { toast } from 'sonner';

type ParsedRow = {
  period_start: string;
  period_end: string;
  value: number;
  cost_amount: number | null;
  raw: Record<string, any>;
  error?: string;
};

const CANDIDATE_KEYS = {
  start: ['period_start', 'date_debut', 'date début', 'debut', 'début', 'start', 'from', 'du'],
  end: ['period_end', 'date_fin', 'date fin', 'fin', 'end', 'to', 'au'],
  value: ['value', 'valeur', 'consommation', 'kwh', 'm3', 'conso', 'quantity', 'quantite', 'quantité'],
  cost: ['cost', 'cout', 'coût', 'cost_amount', 'montant', 'amount', 'prix', 'total'],
};

const findKey = (row: Record<string, any>, candidates: string[]) => {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find(k => k.toLowerCase().trim() === c);
    if (k) return k;
  }
  for (const c of candidates) {
    const k = keys.find(k => k.toLowerCase().trim().includes(c));
    if (k) return k;
  }
  return null;
};

const toISODate = (v: any): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial date -> JS Date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${yy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

const parseCSV = (text: string): Record<string, any>[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const cells = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, any> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? null; });
    return row;
  });
};

export const WattBimImportDialog: React.FC = () => {
  const currency = useOrgCurrency();
  const { data: buildings = [] } = useBuildings();
  const { data: meters = [] } = useMeters();
  const createReading = useCreateReading();

  const [open, setOpen] = useState(false);
  const [meterId, setMeterId] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const meter = meters.find(m => m.id === meterId);
  const meterLabel = (id: string) => {
    const m = meters.find(x => x.id === id);
    if (!m) return '';
    const b = buildings.find(x => x.id === m.building_id);
    return `${b?.name ?? '?'} · ${m.name} (${m.unit})`;
  };

  const validCount = useMemo(() => rows.filter(r => !r.error).length, [rows]);
  const errorCount = rows.length - validCount;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    let json: Record<string, any>[] = [];

    if (file.name.toLowerCase().endsWith('.csv')) {
      json = parseCSV(new TextDecoder().decode(buf));
    } else {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const sheet = wb.worksheets[0];
      if (!sheet) { toast.error('Fichier vide'); return; }
      const headers: string[] = [];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, col) => { headers[col - 1] = String(cell.value ?? '').trim(); });
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const obj: Record<string, any> = {};
        let hasVal = false;
        headers.forEach((h, idx) => {
          const cell = row.getCell(idx + 1);
          let v: any = cell.value;
          if (v && typeof v === 'object' && 'text' in v) v = (v as any).text;
          if (v && typeof v === 'object' && 'result' in v) v = (v as any).result;
          if (v != null && v !== '') hasVal = true;
          obj[h] = v ?? null;
        });
        if (hasVal) json.push(obj);
      }
    }

    if (json.length === 0) {
      toast.error('Fichier vide');
      return;
    }
    const first = json[0];
    const kStart = findKey(first, CANDIDATE_KEYS.start);
    const kEnd = findKey(first, CANDIDATE_KEYS.end);
    const kVal = findKey(first, CANDIDATE_KEYS.value);
    const kCost = findKey(first, CANDIDATE_KEYS.cost);

    if (!kStart || !kEnd || !kVal) {
      toast.error('Colonnes requises introuvables : période début, période fin, valeur');
      return;
    }

    const parsed: ParsedRow[] = json.map((r) => {
      const ps = toISODate(r[kStart]);
      const pe = toISODate(r[kEnd]);
      const val = Number(String(r[kVal] ?? '').toString().replace(',', '.').replace(/\s/g, ''));
      const cost = kCost && r[kCost] != null ? Number(String(r[kCost]).replace(',', '.').replace(/\s/g, '')) : null;
      let error: string | undefined;
      if (!ps || !pe) error = 'Date invalide';
      else if (!isFinite(val) || val <= 0) error = 'Valeur invalide';
      return {
        period_start: ps ?? '',
        period_end: pe ?? '',
        value: val,
        cost_amount: cost != null && isFinite(cost) ? cost : null,
        raw: r,
        error,
      };
    });
    setRows(parsed);
  };

  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Relevés');
    ws.addRow(['date_debut', 'date_fin', 'valeur', 'cout']);
    ws.addRow(['2025-01-01', '2025-01-31', 1250, 380]);
    ws.addRow(['2025-02-01', '2025-02-28', 1180, 360]);
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wattbim_template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };


  const submit = async () => {
    if (!meter) { toast.error('Choisis un compteur'); return; }
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) return;
    setImporting(true);
    let ok = 0, fail = 0;
    for (const r of valid) {
      try {
        await createReading.mutateAsync({
          meter_id: meter.id,
          period_start: r.period_start,
          period_end: r.period_end,
          value: r.value,
          unit: meter.unit,
          cost_amount: r.cost_amount,
          currency,
          source: 'import',
        } as any);
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    if (ok > 0) toast.success(`${ok} relevé(s) importé(s) · sync bilan carbone`);
    if (fail > 0) toast.error(`${fail} échec(s)`);
    setRows([]); setFileName(''); setMeterId(''); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setRows([]); setFileName(''); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={meters.length === 0}>
          <Upload className="h-4 w-4 mr-2" />Importer CSV/Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import en masse de relevés</DialogTitle>
          <DialogDescription>
            Importez plusieurs mois de factures STEG / SONEDE en une seule fois. Colonnes attendues : <b>date_debut</b>, <b>date_fin</b>, <b>valeur</b>, <i>cout</i> (optionnel).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Label>Compteur cible *</Label>
              <Select value={meterId} onValueChange={setMeterId}>
                <SelectTrigger><SelectValue placeholder="Choisir un compteur…" /></SelectTrigger>
                <SelectContent>
                  {meters.map(m => <SelectItem key={m.id} value={m.id}>{meterLabel(m.id)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="mt-6">
              <Download className="h-4 w-4 mr-2" />Modèle
            </Button>
          </div>

          <div>
            <Label>Fichier (.xlsx, .xls, .csv)</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {fileName && <p className="text-xs text-muted-foreground mt-1">{fileName} · {rows.length} ligne(s) détectée(s)</p>}
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />{validCount} valide(s)</Badge>
                {errorCount > 0 && <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3 text-amber-600" />{errorCount} erreur(s)</Badge>}
              </div>
              <div className="max-h-72 overflow-auto border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Du</TableHead><TableHead>Au</TableHead><TableHead>Valeur</TableHead><TableHead>Coût</TableHead><TableHead>État</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.period_start || '—'}</TableCell>
                        <TableCell>{r.period_end || '—'}</TableCell>
                        <TableCell>{isFinite(r.value) ? r.value : '—'}</TableCell>
                        <TableCell>{r.cost_amount ?? '—'}</TableCell>
                        <TableCell>{r.error ? <Badge variant="destructive">{r.error}</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 50 && <p className="text-xs text-muted-foreground p-2">… +{rows.length - 50} ligne(s)</p>}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!meterId || validCount === 0 || importing}>
            {importing ? 'Import…' : `Importer ${validCount} relevé(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
