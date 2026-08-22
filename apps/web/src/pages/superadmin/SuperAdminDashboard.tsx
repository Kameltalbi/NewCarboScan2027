import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Database,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoleCached } from "@/contexts/AppDataContext";

interface DashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  pendingOrders: number;
}

const initialStats: DashboardStats = {
  totalOrganizations: 0,
  totalUsers: 0,
  pendingOrders: 0,
};

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userRole } = useUserRoleCached();
  const isFinanceur = userRole === 'financeur';

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const { items } = await api.adminListOrganizations();
        setStats({
          totalOrganizations: items.length,
          totalUsers: items.reduce((sum, org) => sum + (org.memberCount || 0), 0),
          pendingOrders: 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les indicateurs du tableau de bord',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="h-32 p-6" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background px-6 py-7 shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {isFinanceur ? 'Espace financeur · lecture seule' : 'Administration plateforme'}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Centre de pilotage CarboScan</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Vue consolidée du portefeuille, des utilisateurs et des opérations commerciales nécessitant une action.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-xs text-muted-foreground shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Données synchronisées avec les écrans de gestion
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations suivies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">Portefeuille total suivi dans la plateforme</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs enregistrés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Comptes présents dans la liste Utilisateurs</p>
          </CardContent>
        </Card>

        <Card className={stats.pendingOrders > 0 ? 'border-amber-300 bg-amber-50/50 shadow-sm dark:bg-amber-950/20' : 'border-border/70 shadow-sm'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes à traiter</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Commandes en attente de validation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Priorités opérationnelles</CardTitle>
            <CardDescription>Points nécessitant une vérification de l'équipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Commandes en attente</p>
                <p className="text-xs text-muted-foreground">{stats.pendingOrders} commande(s) à examiner</p>
              </div>
              {!isFinanceur && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Référentiel carbone</p>
                <p className="text-xs text-muted-foreground">ADEME Base Carbone v23.9 · 7 394 facteurs</p>
              </div>
              {!isFinanceur && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Périmètre de pilotage</CardTitle>
            <CardDescription>Responsabilités couvertes par cet espace</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ['Portefeuille', 'Suivi des organisations clientes'],
              ['Accès', 'Comptes et permissions utilisateurs'],
              ['Référentiels', "Bases de facteurs d'émission"],
              ['Acquisition', 'Demandes et opérations commerciales'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Outils d'administration</CardTitle>
          <CardDescription>Accès direct aux espaces de gestion de la plateforme</CardDescription>
        </CardHeader>
        <CardContent className={isFinanceur ? '' : 'grid gap-3 md:grid-cols-3'}>
          {isFinanceur ? (
            <button
              onClick={() => navigate('/app/dashboard')}
              className="group flex w-full items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 text-left transition-all hover:border-primary/40 hover:bg-primary/10"
            >
              <div className="rounded-lg bg-primary p-3 text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Tester l'application CarboScan</p>
                <p className="mt-1 text-sm text-muted-foreground">Ouvrir votre espace client et réaliser un bilan carbone de démonstration.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </button>
          ) : [
            { label: 'Organisations', description: 'Consulter le portefeuille et les plans', icon: Building2, url: '/superadmin/organizations' },
            { label: 'Utilisateurs', description: 'Gérer les comptes et les permissions', icon: Users, url: '/superadmin/users' },
            { label: "Facteurs d'émission", description: 'Vérifier les bases carbone utilisées', icon: Database, url: '/superadmin/emission-factors' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.url)}
              className="group flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
            >
              <div className="rounded-lg bg-muted p-2.5 text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export { SuperAdminDashboard };
export default SuperAdminDashboard;
