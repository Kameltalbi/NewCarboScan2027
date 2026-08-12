import React from "react";
import { Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTIVE_EMISSION_FACTOR_DATABASE = {
  name: 'ADEME Base Carbone v23.9',
  lastUpdatedAt: '2026-04-19T00:00:00.000Z',
  factorCount: 7394,
};

const formatUpdateDate = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));

const SuperAdminEmissionFactors: React.FC = () => (
  <div className="mx-auto max-w-7xl space-y-6 p-6">
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Référentiel carbone</p>
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <Database className="h-6 w-6 text-primary" />
        Facteurs d'émission
      </h2>
      <p className="mt-1 text-muted-foreground">Base officielle utilisée pour les calculs de la plateforme</p>
    </div>

    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Base active</CardTitle>
        <CardDescription>Référentiel actuellement retenu par CarboScan</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom de la base</TableHead>
              <TableHead>Dernière mise à jour</TableHead>
              <TableHead className="text-right">Facteurs d'émission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold">{ACTIVE_EMISSION_FACTOR_DATABASE.name}</TableCell>
              <TableCell>{formatUpdateDate(ACTIVE_EMISSION_FACTOR_DATABASE.lastUpdatedAt)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {ACTIVE_EMISSION_FACTOR_DATABASE.factorCount.toLocaleString('fr-FR')}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

export default SuperAdminEmissionFactors;
