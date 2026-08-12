import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { useCBAMExports, useCBAMProducts, useCBAMInstallations, useCBAMEmissionsSummary } from '../hooks/useCBAMData';
import { useToast } from '@/hooks/use-toast';

export const CBAMReportsPage: React.FC = () => {
  const { data: exports, isLoading: exportsLoading } = useCBAMExports();
  const { data: products } = useCBAMProducts();
  const { data: installations } = useCBAMInstallations();
  const { data: emissionsSummary } = useCBAMEmissionsSummary();
  const { toast } = useToast();

  const getInstName = (id: string) => installations?.find(i => i.id === id)?.name || '—';
  const getProdName = (id: string) => products?.find(p => p.id === id)?.name || '—';
  const getProdCN = (id: string) => products?.find(p => p.id === id)?.cn_code || '—';

  // Calculate emissions per installation
  const getInstEmissions = (instId: string) => {
    const summaries = emissionsSummary?.filter(e => e.installation_id === instId) || [];
    const direct = summaries.reduce((s, e) => s + e.direct_emissions, 0);
    const indirect = summaries.reduce((s, e) => s + e.indirect_emissions, 0);
    const total = summaries.reduce((s, e) => s + e.total_emissions, 0);
    return { direct, indirect, total };
  };

  const handleExportCSV = () => {
    if (!exports?.length) return;
    
    const headers = ['Installation', 'Produit', 'Code CN', 'Client', 'Destination', 'Quantité (t)', 'Date Export', 'Émissions Directes', 'Émissions Indirectes', 'Total Émissions'];
    const rows = exports.map(exp => {
      const emissions = getInstEmissions(exp.installation_id);
      return [
        getInstName(exp.installation_id),
        getProdName(exp.product_id),
        getProdCN(exp.product_id),
        exp.client_name,
        exp.destination_country,
        exp.quantity_exported,
        exp.export_date,
        emissions.direct.toFixed(4),
        emissions.indirect.toFixed(4),
        emissions.total.toFixed(4),
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CBAM_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Rapport CSV téléchargé" });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports CBAM</h1>
          <p className="text-muted-foreground">Génération des rapports réglementaires CBAM.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!exports?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Rapport détaillé des exportations CBAM</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {exportsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !exports?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune exportation à reporter. Enregistrez vos exportations dans l'onglet Exportations.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Installation</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Code CN</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Ém. directes</TableHead>
                    <TableHead>Ém. indirectes</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Période</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map(exp => {
                    const emissions = getInstEmissions(exp.installation_id);
                    return (
                      <TableRow key={exp.id}>
                        <TableCell>{getInstName(exp.installation_id)}</TableCell>
                        <TableCell className="font-medium">{getProdName(exp.product_id)}</TableCell>
                        <TableCell className="font-mono text-xs">{getProdCN(exp.product_id)}</TableCell>
                        <TableCell><Badge variant="outline">{exp.destination_country}</Badge></TableCell>
                        <TableCell>{exp.quantity_exported.toLocaleString()} t</TableCell>
                        <TableCell>{emissions.direct.toFixed(4)} tCO₂e</TableCell>
                        <TableCell>{emissions.indirect.toFixed(4)} tCO₂e</TableCell>
                        <TableCell className="font-semibold">{emissions.total.toFixed(4)} tCO₂e</TableCell>
                        <TableCell>{new Date(exp.export_date).toLocaleDateString('fr-FR')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regulatory info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Informations réglementaires</p>
            <p>Le rapport CBAM doit contenir : l'installation de production, le produit et son code CN, la quantité exportée, les émissions directes et indirectes, et la période de reporting.</p>
            <p>Les rapports sont à soumettre trimestriellement pendant la phase transitoire (jusqu'au 31/12/2025) puis annuellement à partir de 2026.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
