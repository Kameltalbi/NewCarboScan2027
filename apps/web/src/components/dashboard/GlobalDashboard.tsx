// Dashboard global agrégé
// Affiche les données de tous les modules depuis activity_data
// CONTENU DYNAMIQUE selon les modules activés par l'utilisateur

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationModules } from '@/hooks/useOrganizationModules';
import { DashboardAggregator, DashboardAggregatedData } from '@/lib/calculators/DashboardAggregator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Package, CheckCircle2, AlertCircle, BarChart3, Leaf } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ModuleCTA } from './ModuleCTA';

const COLORS = ['#1ABC9C', '#0F172A', '#86EFAC'];

export const GlobalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const { modules, loading: modulesLoading, hasModule } = useOrganizationModules();
  const [data, setData] = useState<DashboardAggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vérifier l'accès aux modules
  const hasBilanCarbone = hasModule('bilan-carbone');
  const hasEmpreinteProduit = hasModule('empreinte-produit');
  const hasACV = hasModule('acv');

  useEffect(() => {
    const loadData = async () => {
      if (!user || !organizationId || orgLoading) return;

      try {
        setLoading(true);
        setError(null);

        const currentYear = new Date().getFullYear();
        const periodStart = `${currentYear}-01-01`;
        const periodEnd = `${currentYear}-12-31`;

        const aggregated = await DashboardAggregator.aggregate(
          organizationId,
          periodStart,
          periodEnd
        );

        setData(aggregated);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, organizationId, orgLoading]);

  if (loading || modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  const scopeData = [
    { name: 'Scope 1', value: data.bilanCarbone.scope1 },
    { name: 'Scope 2', value: data.bilanCarbone.scope2 },
    { name: 'Scope 3', value: data.bilanCarbone.scope3 },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Global</h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre empreinte carbone - Données depuis le socle central
        </p>
      </div>

      {/* KPI Cards - Conditionnées par modules activés */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Empreinte totale - Toujours visible si Bilan Carbone activé */}
        {hasBilanCarbone && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Empreinte totale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(data.bilanCarbone.totalEmissions / 1000).toLocaleString('fr-FR')}
              </div>
              <p className="text-xs text-muted-foreground">tCO₂e</p>
            </CardContent>
          </Card>
        )}

        {/* Données réelles - Toujours visible */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Données réelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.dataQuality.real.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.dataQuality.estimated.toFixed(0)}% estimées
            </p>
          </CardContent>
        </Card>

        {/* Produits suivis - Visible uniquement si Empreinte Produit activé */}
        {hasEmpreinteProduit ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Produits suivis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.products.length}</div>
              <p className="text-xs text-muted-foreground">empreintes calculées</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Produits suivis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Module non activé</div>
            </CardContent>
          </Card>
        )}

        {/* Modules actifs - Toujours visible */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Modules actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
            <p className="text-xs text-muted-foreground">modules achetés</p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par Scope - Visible uniquement si Bilan Carbone activé */}
      {hasBilanCarbone ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Répartition par Scope</CardTitle>
            </CardHeader>
            <CardContent>
              {scopeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={scopeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {scopeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${Math.round(value / 1000).toLocaleString('fr-FR')} tCO₂e`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnée de scope disponible
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Breakdown détaillé</CardTitle>
            </CardHeader>
            <CardContent>
              {data.bilanCarbone.breakdown.length > 0 ? (
                <div className="space-y-3">
                  {data.bilanCarbone.breakdown.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {Math.round(item.emissions / 1000).toLocaleString('fr-FR')} tCO₂e
                        </span>
                        <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun breakdown disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <ModuleCTA
          moduleSlug="bilan-carbone"
          title="Bilan Carbone"
          description="Calculez l'impact global de votre entreprise (Scopes 1, 2, 3)"
        />
      )}

      {/* Qualité des données */}
      <Card>
        <CardHeader>
          <CardTitle>Qualité des données</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Données réelles</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${data.dataQuality.real}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{data.dataQuality.real.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span>Données estimées</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${data.dataQuality.estimated}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{data.dataQuality.estimated.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <span>Données par défaut</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div
                    className="bg-gray-400 h-2 rounded-full"
                    style={{ width: `${data.dataQuality.default}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{data.dataQuality.default.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Empreinte Produit - Visible uniquement si module activé */}
      {hasEmpreinteProduit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Contribution des produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.products.length > 0 ? (
                <div className="space-y-3">
                  {data.products.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{product.name || `Produit ${index + 1}`}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {product.footprint.toFixed(2)} kg CO₂e
                        </span>
                        <Badge variant="secondary">
                          {product.functionalUnit || 'unité'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun produit suivi pour le moment
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top produits émetteurs</CardTitle>
            </CardHeader>
            <CardContent>
              {data.products.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.products.slice(0, 5).map((p, i) => ({
                    name: p.name || `Produit ${i + 1}`,
                    emissions: p.footprint,
                  }))}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`} />
                    <Bar dataKey="emissions" fill="#1ABC9C" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnée disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <ModuleCTA
          moduleSlug="empreinte-produit"
          title="Empreinte Produit"
          description="Calculez l'empreinte carbone de vos produits par unité fonctionnelle"
        />
      )}

      {/* Section ACV Simple - Visible uniquement si module activé */}
      {hasACV ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Analyses Cycle de Vie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les analyses ACV seront affichées ici une fois que vous aurez créé vos premiers projets ACV.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ModuleCTA
          moduleSlug="acv"
          title="ACV Simple"
          description="Analysez vos produits selon une logique cycle de vie simplifiée"
        />
      )}
    </div>
  );
};

