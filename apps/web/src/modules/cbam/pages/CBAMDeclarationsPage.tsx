import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Download, Eye, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import * as ExcelJS from 'exceljs';
import type { CBAMPayload } from '../types';

interface CBAMReport {
  id: string;
  product_name: string;
  country: string;
  period: string;
  energy_em: number;
  materials_em: number;
  transport_em: number;
  process_em: number;
  total_em: number;
  pdf_url: string | null;
  raw_json: CBAMPayload;
  created_at: string;
}

interface CBAMReportRow {
  id: string;
  product_name: string;
  country: string;
  period: string;
  energy_em: number;
  materials_em: number;
  transport_em: number;
  process_em: number;
  total_em: number;
  pdf_url: string | null;
  raw_json: unknown;
  created_at: string;
}

const CBAM_RATE = 60; // €/tCO2e

export const CBAMDeclarationsPage: React.FC = () => {
  const [reports, setReports] = useState<CBAMReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from('cbam_reports' as any)
        .select('*')
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: CBAMReportRow[] | null; error: any }>);

      if (error) throw error;

      setReports((data || []).map(row => ({
        ...row,
        raw_json: row.raw_json as CBAMPayload
      })));
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les déclarations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDownloadPDF = (report: CBAMReport) => {
    if (report.pdf_url) {
      const link = document.createElement('a');
      link.href = report.pdf_url;
      link.download = `CBAM_${report.product_name}_${report.period}.pdf`;
      link.click();
    }
  };

  const handleDownloadExcel = async (report: CBAMReport) => {
    try {
      // Créer un nouveau workbook avec les résultats
      const workbook = new ExcelJS.Workbook();
      
      // Feuille Résultats
      const resultsSheet = workbook.addWorksheet('Résultats');
      resultsSheet.addRow(['Résultats du Calcul CBAM']);
      resultsSheet.addRow(['']);
      resultsSheet.addRow(['ID Déclaration', report.id]);
      resultsSheet.addRow(['Produit', report.product_name]);
      resultsSheet.addRow(['Pays', report.country]);
      resultsSheet.addRow(['Période', report.period]);
      resultsSheet.addRow(['Quantité importée', report.raw_json?.general?.quantity_imported || '', report.raw_json?.general?.unit || '']);
      resultsSheet.addRow(['']);
      resultsSheet.addRow(['Émissions Énergétiques (tCO₂e)', report.energy_em]);
      resultsSheet.addRow(['Émissions Matériaux (tCO₂e)', report.materials_em]);
      resultsSheet.addRow(['Émissions Transport (tCO₂e)', report.transport_em]);
      resultsSheet.addRow(['Émissions Processus (tCO₂e)', report.process_em]);
      resultsSheet.addRow(['']);
      resultsSheet.addRow(['Total Émissions (tCO₂e)', report.total_em]);
      resultsSheet.addRow(['Taux CBAM (€/tCO₂e)', CBAM_RATE]);
      resultsSheet.addRow(['Montant CBAM (€)', report.total_em * CBAM_RATE]);
      resultsSheet.addRow(['']);
      resultsSheet.addRow(['Date de création', new Date(report.created_at).toLocaleDateString('fr-FR')]);
      
      // Ajouter les feuilles originales si disponibles
      if (report.raw_json?.general) {
        const generalSheet = workbook.addWorksheet('General');
        generalSheet.addRow(Object.keys(report.raw_json.general));
        generalSheet.addRow(Object.values(report.raw_json.general));
      }
      
      // Télécharger
      const fileName = `CBAM_${report.product_name}_${report.period}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Succès",
        description: "Fichier Excel téléchargé",
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-[#009879] mb-2">
          Mes Déclarations CBAM
        </h1>
        <p className="text-gray-600 text-lg mb-4">
          Vos déclarations CBAM sont enregistrées automatiquement. Vous pouvez télécharger vos rapports CBAM officiels en PDF ou Excel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <CardTitle>Liste des Déclarations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-muted-foreground">Chargement des déclarations...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucune déclaration CBAM disponible.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Créez un nouveau calcul pour générer une déclaration.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Déclaration</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Total Émissions</TableHead>
                    <TableHead>Montant CBAM</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const cbamAmount = report.total_em * CBAM_RATE;
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono text-xs">
                          {report.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {report.product_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.country}</Badge>
                        </TableCell>
                        <TableCell>{report.period}</TableCell>
                        <TableCell>
                          {report.total_em.toFixed(4)} tCO₂e
                        </TableCell>
                        <TableCell className="font-semibold text-green-700">
                          {cbamAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(report.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {report.pdf_url && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPDF(report.pdf_url!)}
                                  title="Voir le PDF"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadPDF(report)}
                                  title="Télécharger PDF"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadExcel(report)}
                              title="Télécharger Excel"
                              className="bg-[#009879] hover:bg-[#007a63] text-white border-[#009879]"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
