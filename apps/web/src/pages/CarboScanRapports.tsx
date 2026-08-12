import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileSpreadsheet, BarChart3, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export const CarboScanRapports: React.FC = () => {
  const navigate = useNavigate();

  const reportTypes = [
    {
      title: "Rapport Bilan Carbone PDF",
      description: "Export détaillé de votre bilan carbone avec graphiques et analyses",
      icon: FileText,
      action: () => navigate("/carbo-start/bilans"),
      available: true,
    },
    {
      title: "Export Excel - Données brutes",
      description: "Téléchargez toutes vos données de collecte au format Excel",
      icon: FileSpreadsheet,
      action: () => navigate("/carbo-start/collecte-donnees"),
      available: true,
    },
    {
      title: "Rapport KPI - Indicateurs clés",
      description: "Synthèse des indicateurs : tCO₂e/employé, tCO₂e/m², tCO₂e/CA",
      icon: BarChart3,
      action: () => navigate("/carbo-start/dashboard"),
      available: true,
    },
    {
      title: "Rapport Évolution & Tendances",
      description: "Analyse comparative multi-années et projection des réductions",
      icon: TrendingUp,
      action: () => {},
      available: false,
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Rapports & Export
        </h1>
        <p className="text-muted-foreground">
          Exportez vos données et générez des rapports professionnels pour vos analyses carbone
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      {!report.available && (
                        <Badge variant="secondary" className="mt-1">
                          Prochainement
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={report.action}
                  disabled={!report.available}
                  className="w-full"
                  variant={report.available ? "default" : "outline"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {report.available ? "Générer" : "Bientôt disponible"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            💡 Conseil Pro
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <p className="mb-2">
            Pour des rapports personnalisés adaptés à vos besoins spécifiques, contactez notre équipe.
          </p>
          <p className="text-sm">
            Nous pouvons créer des exports sur-mesure pour vos analyses sectorielles, 
            comparaisons multi-sites, ou conformité réglementaire.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
