import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CarboScanReports } from '@/modules/bilan-carbone/CarboScanReports';

export const ReportingBilan: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rapports Bilan Carbone</h1>
          <p className="text-muted-foreground mt-1">Générez et consultez vos rapports de bilan carbone</p>
        </div>
      </div>

      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Nouveau — Moteur de rapport professionnel</div>
              <div className="text-sm text-muted-foreground">
                PDF vectoriel A4, structure GHG Protocol / ISO 14064, multi-langue (FR/EN).
              </div>
            </div>
          </div>
          <Button asChild>
            <Link to="/app/reporting/pro">Essayer <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </CardContent>
      </Card>

      <CarboScanReports />
    </div>
  );
};
