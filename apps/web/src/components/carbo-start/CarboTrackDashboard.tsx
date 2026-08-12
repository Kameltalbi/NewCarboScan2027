import React, { useState, useEffect } from "react";
import { logger } from '@/utils/logger';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const CarboScanDashboard: React.FC = () => {
  const [realData, setRealData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
  }>({});
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userPlan, hasFeature } = usePlanAccess();

  // Récupérer l'utilisateur connecté et ses informations de profil
  useEffect(() => {
    const getUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Récupérer les informations de l'entreprise
          const { data: company } = await supabase
            .from('companies')
            .select('nom_entreprise')
            .eq('user_id', user.id)
            .single();

          // Récupérer les métadonnées utilisateur
          const userMetadata = user.user_metadata || {};
          
          setUserProfile({
            firstName: userMetadata.first_name || '',
            lastName: userMetadata.last_name || '',
            company: company?.nom_entreprise || userMetadata.company || '',
            email: user.email || ''
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        setUserProfile({ email: user?.email || '' });
      }
    };
    
    getUserAndProfile();
  }, []);

  // Générer un nom d'affichage professionnel
  const getDisplayName = () => {
    const { firstName, lastName, company, email } = userProfile;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    if (firstName) {
      return firstName;
    }
    
    if (company) {
      return company;
    }
    
    // Fallback sur l'email en extrayant le nom avant le @
    if (email) {
      const emailName = email.split('@')[0];
      return emailName.replace(/[._]/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return t("dashboard.layout.welcome");
  };

  const getOrganizationInfo = () => {
    const { company } = userProfile;
    return company || t("dashboard.layout.unspecifiedOrganization");
  };

  // Chargement des vraies données avec souscription en temps réel
  useEffect(() => {
    const fetchRealData = async () => {
      if (!user?.id) return;

      try {
        // Récupérer les bilans carbone de l'utilisateur
        const { data: bilans, error } = await supabase
          .from('bilans_carbone')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erreur lors du chargement des bilans:', error);
          setLoading(false);
          return;
        }

        logger.debug('Bilans récupérés:', bilans?.length);
        const latestBilan = bilans?.[0];
        logger.debug('Latest bilan:', latestBilan?.id);
        
        // Vérifier s'il y a des données locales si pas de bilans en base
        if ((!bilans || bilans.length === 0) && user.id) {
          logger.debug('Aucun bilan en base, vérification localStorage...');
          const localData = localStorage.getItem(`questionnaire_progress_${user.id}`);
          if (localData) {
            logger.debug('Données locales trouvées');
            const parsed = JSON.parse(localData);
            if (parsed.questionnaire_data) {
              // Calculer les émissions depuis les données locales
              const formData = parsed.questionnaire_data;
              let scope1Total = 0, scope2Total = 0, scope3Total = 0;
              
              if (formData.combustibleGaz) scope1Total += formData.combustibleGaz * 0.227;
              if (formData.combustibleFioul) scope1Total += formData.combustibleFioul * 0.324;
              if (formData.electricite) scope2Total += formData.electricite * 0.057;
              if (formData.deplacementsVoiture) scope3Total += formData.deplacementsVoiture * 0.193;
              if (formData.deplacementsTrain) scope3Total += formData.deplacementsTrain * 0.003;
              if (formData.deplacementsAvion) scope3Total += formData.deplacementsAvion * 0.255;
              
              logger.debug('Émissions calculées depuis localStorage');
              
              const newRealData = {
                bilansRealises: 1,
                totalEmissions: scope1Total + scope2Total + scope3Total,
                scope1: scope1Total,
                scope2: scope2Total,
                scope3: scope3Total,
                planType: userPlan.planName,
                isFromLocalStorage: true
              };
              
              logger.debug('Données depuis localStorage');
              setRealData(newRealData);
              setLoading(false);
              return;
            }
          }
        }
        
        const newRealData = {
          bilansRealises: bilans?.length || 0,
          // Convertir les valeurs de kg en tonnes pour l'affichage
          totalEmissions: latestBilan ? Number(latestBilan.total_emission) / 1000 : 0,
          scope1: latestBilan ? Number(latestBilan.scope1_emission) / 1000 : 0,
          scope2: latestBilan ? Number(latestBilan.scope2_emission) / 1000 : 0,
          scope3: latestBilan ? Number(latestBilan.scope3_emission) / 1000 : 0,
          planType: userPlan.planName
        };
        
        logger.debug('Nouvelles données calculées');
        setRealData(newRealData);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();

    // Souscrire aux changements en temps réel de la table bilans_carbone
    const channel = supabase
      .channel('bilans_carbone_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bilans_carbone',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          logger.debug('Changement détecté dans bilans_carbone');
          // Rafraîchir les données quand il y a un changement
          fetchRealData();
        }
      )
      .subscribe();

    // Nettoyer la souscription lors du démontage du composant
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Utiliser les vraies données ou des données vides quand il n'y a pas de bilans
  const stats = realData || {
    totalEmissions: 0,
    scope1: 0,
    scope2: 0,
    scope3: 0,
    bilansRealises: 0,
    planType: userPlan.planName
  };

  logger.debug('CarboScanDashboard - realData loaded');



  // Données pour le graphique mensuel des émissions GHG
  const monthlyEmissions = [
    { month: 'Jan', scope1: stats.scope1 * 0.8, scope2: stats.scope2 * 0.8, scope3: stats.scope3 * 0.8 },
    { month: 'Feb', scope1: stats.scope1 * 0.9, scope2: stats.scope2 * 0.9, scope3: stats.scope3 * 0.9 },
    { month: 'Mar', scope1: stats.scope1 * 1.1, scope2: stats.scope2 * 1.1, scope3: stats.scope3 * 1.1 },
    { month: 'Apr', scope1: stats.scope1 * 0.85, scope2: stats.scope2 * 0.85, scope3: stats.scope3 * 0.85 },
    { month: 'May', scope1: stats.scope1 * 1.05, scope2: stats.scope2 * 1.05, scope3: stats.scope3 * 1.05 },
    { month: 'Jun', scope1: stats.scope1 * 0.95, scope2: stats.scope2 * 0.95, scope3: stats.scope3 * 0.95 },
    { month: 'Jul', scope1: stats.scope1 * 0.9, scope2: stats.scope2 * 0.9, scope3: stats.scope3 * 0.9 },
    { month: 'Aug', scope1: stats.scope1 * 1.0, scope2: stats.scope2 * 1.0, scope3: stats.scope3 * 1.0 },
    { month: 'Sep', scope1: stats.scope1 * 0.92, scope2: stats.scope2 * 0.92, scope3: stats.scope3 * 0.92 },
    { month: 'Oct', scope1: stats.scope1 * 0.98, scope2: stats.scope2 * 0.98, scope3: stats.scope3 * 0.98 },
    { month: 'Nov', scope1: stats.scope1 * 1.02, scope2: stats.scope2 * 1.02, scope3: stats.scope3 * 1.02 },
    { month: 'Dec', scope1: stats.scope1 * 0.88, scope2: stats.scope2 * 0.88, scope3: stats.scope3 * 0.88 },
  ];

  // Calculer les valeurs actuelles pour les KPI - utiliser les vraies données ou 0
  const actualScope1 = stats.scope1 || 0;
  const actualScope2 = stats.scope2 || 0;
  const actualScope3 = stats.scope3 || 0;
  const actualTotal = actualScope1 + actualScope2 + actualScope3;

  logger.debug('CarboScanDashboard - valeurs calculées', { actualScope1, actualScope2, actualScope3, actualTotal });

  // Données pour les mini-graphiques de tendance
  const trendData = [
    { month: 1, value: actualTotal * 0.92 },
    { month: 2, value: actualTotal * 0.95 },
    { month: 3, value: actualTotal * 0.91 },
    { month: 4, value: actualTotal * 0.98 },
    { month: 5, value: actualTotal * 1.02 },
    { month: 6, value: actualTotal },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)} tCO₂e
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const MiniTrendChart = ({ data, color }: { data: any[], color: string }) => (
    <div className="h-12 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>{t("dashboard.sidebar.dashboard")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">📅 Jan 24 - Déc 24</Badge>
        </div>
      </div>





      {/* KPI Cards - Monthly GHG Scope */}
      <div>

        <div className={`grid grid-cols-1 gap-4 ${hasFeature('canAccessScope3') ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {/* Scope 1 */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">SCOPE 1</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>
                      {actualScope1.toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">tCO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData.map(d => ({ ...d, value: d.value * 0.35 }))} color="#2d6e4a" />
              </div>
            </CardContent>
          </Card>

          {/* Scope 2 */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">SCOPE 2</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>
                      {actualScope2.toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">tCO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData.map(d => ({ ...d, value: d.value * 0.43 }))} color="#3b82f6" />
              </div>
            </CardContent>
          </Card>

          {/* Scope 3 - Conditionally rendered */}
          {hasFeature('canAccessScope3') && (
            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">SCOPE 3</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>
                        {actualScope3.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">tCO₂e</span>
                    </div>
                  </div>
                  <MiniTrendChart data={trendData.map(d => ({ ...d, value: d.value * 0.23 }))} color="#06b6d4" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">TOTAL</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>
                      {actualTotal.toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">tCO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData} color="#10b981" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section des 4 graphiques organisés en 2x2 */}
      <div className="space-y-6">
        {/* Ligne 1 : Graphiques 1 et 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Graphique 1 : Résultats de l'année et simulation des réductions par secteur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("dashboard.complete.overview")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("dashboard.complete.bySector")}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actualTotal > 0 ? [
                  { secteur: 'Industrie', actuel: actualScope1 + actualScope2 * 0.3, reduit: (actualScope1 + actualScope2 * 0.3) * 0.8, reduction: 20 },
                  { secteur: 'Transport', actuel: actualScope3 * 0.5, reduit: actualScope3 * 0.5 * 0.8, reduction: 20 },
                  { secteur: 'Bâtiment', actuel: actualScope2 * 0.7, reduit: actualScope2 * 0.7 * 0.8, reduction: 20 },
                  { secteur: 'Services', actuel: actualScope3 * 0.3, reduit: actualScope3 * 0.3 * 0.8, reduction: 20 },
                  { secteur: 'Agriculture', actuel: actualScope1 * 0.2, reduit: actualScope1 * 0.2 * 0.8, reduction: 20 }
                ] : [
                  { secteur: 'Aucune donnée', actuel: 0, reduit: 0, reduction: 0 }
                ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="secteur" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `${value} tCO₂e`, 
                      name === 'actuel' ? 'Émissions actuelles' : 'Émissions réduites'
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="actuel" 
                    name="Émissions actuelles" 
                    fill="#2d6e4a"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="reduit" 
                    name="Émissions réduites" 
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Graphique 2 : Répartition par Scope (camembert) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("dashboard.complete.emissionsBreakdown")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("dashboard.complete.ghgDistribution")}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actualTotal > 0 ? [
                      { name: 'Scope 1', value: actualScope1, fill: '#2d6e4a' },
                      { name: 'Scope 2', value: actualScope2, fill: '#5b8a6b' },
                      { name: 'Scope 3', value: actualScope3, fill: '#c7ea46' }
                    ] : [
                      { name: 'Aucune donnée', value: 1, fill: '#e5e7eb' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={actualTotal > 0 ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : () => 'Aucune donnée'}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(actualTotal > 0 ? [
                      { name: 'Scope 1', value: actualScope1, fill: '#2d6e4a' },
                      { name: 'Scope 2', value: actualScope2, fill: '#5b8a6b' },
                      { name: 'Scope 3', value: actualScope3, fill: '#c7ea46' }
                    ] : [
                      { name: 'Aucune donnée', value: 1, fill: '#e5e7eb' }
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(1)} tCO₂e`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ligne 2 : Graphiques 3 et 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Graphique 3 : Comparaison avec le secteur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("dashboard.complete.sectorComparison")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("dashboard.complete.companyVsSector")}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actualTotal > 0 ? [
                  { metrique: 'Intensité carbone', entreprise: Math.max(0.1, actualTotal * 0.006), secteur: 3.2, difference: -34 },
                  { metrique: 'Efficacité énergétique', entreprise: Math.min(100, 50 + actualScope2 * 2), secteur: 72, difference: 18 },
                  { metrique: 'Transport', entreprise: Math.max(0.1, actualScope3 * 0.02), secteur: 2.5, difference: -28 },
                  { metrique: 'Processus', entreprise: Math.max(0.1, actualScope1 * 0.03), secteur: 4.1, difference: -22 },
                  { metrique: 'Innovation', entreprise: Math.min(100, 40 + actualTotal * 0.1), secteur: 65, difference: 20 }
                ] : [
                  { metrique: 'Aucune donnée', entreprise: 0, secteur: 0, difference: 0 }
                ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="metrique" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'difference' ? `${value > 0 ? '+' : ''}${value}%` : value,
                      name === 'entreprise' ? 'Votre entreprise' : 
                      name === 'secteur' ? 'Secteur moyen' : 'Différence'
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="entreprise" 
                    name={t("dashboard.complete.yourCompany")} 
                    fill="#2d6e4a"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="secteur" 
                    name={t("dashboard.complete.averageSector")} 
                    fill="#6b7280"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Graphique 4 : Postes d'émissions en barres */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("dashboard.complete.emissionSources")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("dashboard.complete.detailedBreakdown")}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actualTotal > 0 ? [
                  { poste: 'Combustibles', emissions: actualScope1 * 0.8, scope: 'Scope 1', color: '#2d6e4a' },
                  { poste: 'Électricité', emissions: actualScope2 * 0.6, scope: 'Scope 2', color: '#10b981' },
                  { poste: 'Processus', emissions: actualScope1 * 0.6, scope: 'Scope 1', color: '#059669' },
                  { poste: 'Transport', emissions: actualScope3 * 0.4, scope: 'Scope 3', color: '#16a34a' },
                  { poste: 'Chauffage', emissions: actualScope2 * 0.4, scope: 'Scope 2', color: '#22c55e' },
                  { poste: 'Achats', emissions: actualScope3 * 0.3, scope: 'Scope 3', color: '#4ade80' },
                  { poste: 'Déchets', emissions: actualScope3 * 0.2, scope: 'Scope 3', color: '#86efac' }
                ].sort((a, b) => b.emissions - a.emissions) : [
                  { poste: 'Aucune donnée', emissions: 0, scope: 'N/A', color: '#e5e7eb' }
                ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="poste" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                                     <Tooltip 
                     formatter={(value: any) => [`${value.toFixed(1)} tCO₂e`, 'Émissions']}
                   />
                                     <Bar 
                     dataKey="emissions" 
                     name="Émissions" 
                     fill="#2d6e4a"
                     radius={[4, 4, 0, 0]}
                   >
                     {(actualTotal > 0 ? [
                        { poste: 'Combustibles', emissions: actualScope1 * 0.8, scope: 'Scope 1', color: '#2d6e4a' },
                        { poste: 'Électricité', emissions: actualScope2 * 0.6, scope: 'Scope 2', color: '#10b981' },
                        { poste: 'Processus', emissions: actualScope1 * 0.6, scope: 'Scope 1', color: '#059669' },
                        { poste: 'Transport', emissions: actualScope3 * 0.4, scope: 'Scope 3', color: '#16a34a' },
                        { poste: 'Chauffage', emissions: actualScope2 * 0.4, scope: 'Scope 2', color: '#22c55e' },
                        { poste: 'Achats', emissions: actualScope3 * 0.3, scope: 'Scope 3', color: '#4ade80' },
                        { poste: 'Déchets', emissions: actualScope3 * 0.2, scope: 'Scope 3', color: '#86efac' }
                      ].sort((a, b) => b.emissions - a.emissions) : [
                        { poste: 'Aucune donnée', emissions: 0, scope: 'N/A', color: '#e5e7eb' }
                      ]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
