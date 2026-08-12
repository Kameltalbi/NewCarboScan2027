// Composant SuperAdmin pour importer la base ADEME v23.9 (versioning préservé)
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { Upload, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface FactorRow {
  category: string;
  subcategory: string | null;
  factor_name: string;
  nom_affiche: string;
  slug: string;
  emission_factor: number;
  unit: string;
  source: string;
  year: number;
}

interface BatchResult {
  inserted: number;
  superseded: number;
}

const BATCH_SIZE = 500;

const AdemeImporter: React.FC = () => {
  const [rows, setRows] = useState<FactorRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Le fichier doit être un tableau JSON');
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
      setError(null);
      toast({
        title: 'Fichier chargé',
        description: `${parsed.length} facteurs détectés dans ${file.name}`,
      });
    } catch (err: any) {
      setError(`Erreur lecture fichier: ${err.message}`);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setError(null);
    let totalInserted = 0;
    let totalSuperseded = 0;

    try {
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        const { data, error: invokeError } = await supabase.functions.invoke(
          'import-ademe-factors',
          { body: { rows: batch, supersede_old: true } }
        );

        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);

        totalInserted += data?.inserted_count || 0;
        totalSuperseded += data?.superseded_count || 0;

        const pct = Math.round(((i + 1) / totalBatches) * 100);
        setProgress(pct);
      }

      setResult({ inserted: totalInserted, superseded: totalSuperseded });
      toast({
        title: 'Import terminé ✅',
        description: `${totalInserted} nouveaux FE, ${totalSuperseded} anciens marqués obsolètes`,
      });
    } catch (err: any) {
      setError(`Erreur import: ${err.message || String(err)}`);
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de l\'import',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Import ADEME Base Carbone v23.9
        </CardTitle>
        <CardDescription>
          Importe les 7 394 facteurs ADEME v23.9 avec versioning automatique. Les anciennes
          versions sont marquées comme obsolètes (jamais supprimées) pour préserver l'auditabilité.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File upload */}
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={importing}
            className="hidden"
            id="ademe-file-input"
          />
          <label
            htmlFor="ademe-file-input"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName || 'Cliquez pour charger le JSON ADEME v23.9'}
            </p>
            {rows.length > 0 && (
              <Badge variant="secondary" className="mt-1">
                {rows.length.toLocaleString('fr-FR')} facteurs prêts
              </Badge>
            )}
          </label>
        </div>

        {/* Progress */}
        {importing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Import en cours...
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Result */}
        {result && (
          <Alert className="border-primary/50 bg-primary/10">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <AlertTitle>Import réussi</AlertTitle>
            <AlertDescription className="space-y-1 mt-2">
              <p>✅ <strong>{result.inserted}</strong> nouveaux facteurs insérés</p>
              <p>📦 <strong>{result.superseded}</strong> anciens facteurs marqués comme obsolètes</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action button */}
        <Button
          onClick={handleImport}
          disabled={rows.length === 0 || importing}
          className="w-full"
          size="lg"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Import en cours ({progress}%)
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Lancer l'import ({rows.length.toLocaleString('fr-FR')} facteurs)
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          ℹ️ Stratégie : (1) doublons ADEME v23.9 ignorés via index unique, (2) anciennes versions
          d'un même <code>factor_name</code> automatiquement marquées <code>is_active = false</code>
          avec lien vers la nouvelle version (<code>superseded_by</code>).
        </p>
      </CardContent>
    </Card>
  );
};

export default AdemeImporter;
