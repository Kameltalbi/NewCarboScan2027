import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, TrendingDown, Cpu, FileText, ArrowRight } from "lucide-react";

const NetZeroApp = lazy(() => import("../net-zero/NetZeroApp").then(m => ({ default: m.NetZeroApp })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const DecarbotechDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Monitoring & Réduction</h1>
        <p className="text-muted-foreground mt-1">Plan de réduction Net-Zero et suivi IoT</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Réduction ciblée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">—</div>
            <p className="text-xs text-muted-foreground">Objectif à définir via un run publié (pas de −40&nbsp;% inventé)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">projets actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capteurs IoT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">connectés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Économies réalisées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">tCO₂e évitées</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Définir ma trajectoire</CardTitle>
            <CardDescription>Créez votre plan de réduction Net-Zero</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Commencer <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center mb-2">
              <TrendingDown className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardTitle>Actions de réduction</CardTitle>
            <CardDescription>Consultez les recommandations personnalisées</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Voir les actions <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center mb-2">
              <Cpu className="h-6 w-6 text-accent-foreground" />
            </div>
            <CardTitle>Capteurs IoT</CardTitle>
            <CardDescription>Connectez vos capteurs pour un suivi en temps réel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Configurer <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const DecarbotechApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="decarbotech">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<DecarbotechDashboard />} />
          <Route path="trajectoire/*" element={<NetZeroApp />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

export default DecarbotechApp;
