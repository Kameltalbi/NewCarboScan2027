import React, { useEffect, useState } from "react";
import { logger } from '@/utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Edit2, Trash2, Calendar, UserPlus, RefreshCcw, Minus, RotateCcw, BarChart3, TrendingUp, TrendingDown, X, Download, Package, CheckCircle2, Upload, FileCheck, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OrganizationDashboard } from "@/components/dashboard/OrganizationDashboard";
import { OrganizationModulesManager } from "@/components/superadmin/OrganizationModulesManager";
import { TokenQuotaManager } from "@/components/superadmin/TokenQuotaManager";
import { OrganizationYearsManager } from "@/components/superadmin/OrganizationYearsManager";
import { OrganizationPlanMenu } from "@/components/superadmin/OrganizationPlanMenu";
import {
  deduplicateOrganizationRows,
  resolveOrganizationDisplayName,
  resolveOrganizationEmail,
} from "@/lib/superadmin/organizationCounting";
import { MANAGED_CLIENT_ACCOUNTS } from "@/lib/superadmin/managedClients";
import { DeleteOrganizationDialog } from "@/components/superadmin/DeleteOrganizationDialog";
import { useUserRoleCached } from "@/contexts/AppDataContext";
interface Organization {
  id: string;
  nom_entreprise: string;
  secteur: string;
  collaborateurs: number;
  ca_annuel: number;
  created_at: string;
  user_id: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: string;
  contact_name?: string;
  cbam_emissions?: number;
  subscription?: {
    id: string;
    plan_type: string;
    status: string;
    expires_at: string;
    assessments_used: number;
    assessments_limit: number;
  };
}

export const SuperAdminOrganizations = () => {
  logger.debug('SuperAdminOrganizations rendered');
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizationDetailsOpen, setIsOrganizationDetailsOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardOrg, setDashboardOrg] = useState<Organization | null>(null);
  const { toast } = useToast();
  const { userRole } = useUserRoleCached();
  const isReadOnly = userRole === 'financeur';

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      logger.debug('Fetching organizations data...');

      // Récupérer les inscriptions du calculateur gratuit
      const { data: freeCalculatorData, error: freeCalculatorError } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('request_type', 'free_calculator')
        .order('created_at', { ascending: false });

      if (freeCalculatorError) throw freeCalculatorError;
      logger.debug('Free calculator registrations:', freeCalculatorData?.length);

      // Récupérer les inscriptions du calculateur CBAM
      const { data: cbamCalculatorData, error: cbamCalculatorError } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('request_type', 'cbam_calculator')
        .order('created_at', { ascending: false });

      if (cbamCalculatorError) throw cbamCalculatorError;
      logger.debug('CBAM calculator registrations:', cbamCalculatorData?.length);

      // Récupérer les profils (où sont stockées les vraies inscriptions)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      logger.debug('Profiles data:', profilesData?.length);

      // Récupérer aussi les entreprises créées manuellement
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      logger.debug('Companies data:', companiesData?.length);

      // Récupérer les commandes validées (nouvelles organisations créées via SuperAdmin)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'validated')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      logger.debug('Orders data:', ordersData?.length);

      // Fetch subscriptions for each user
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*');

      if (subscriptionsError) throw subscriptionsError;

      // Récupérer les informations des utilisateurs via auth
      let users: any[] = [];
      try {
        // Note: This requires admin privileges and may fail in some environments
        const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers();
        if (!usersError && authUsers) {
          users = authUsers;
        }
      } catch (error) {
        logger.warn('Could not fetch user emails (admin privileges required):', error);
        // Continue without user emails - we'll use fallback data
      }

      // Créer les organisations du calculateur CBAM
      const cbamCalculatorOrganizations = cbamCalculatorData?.map((request, index) => {
        // Extraire les informations du message CBAM
        const message = request.message || '';
        const nameMatch = message.match(/Nom: ([^-]+)/);
        const sectorMatch = message.match(/Secteur: ([^-]+)/);
        const addressMatch = message.match(/Adresse: ([^-]+)/);
        const emissionsMatch = message.match(/Émissions CBAM: ([0-9.]+)/);
        
        return {
          id: request.id,
          nom_entreprise: request.company_name || 'Entreprise Inconnue',
          secteur: sectorMatch ? sectorMatch[1].trim() : 'Non spécifié',
          collaborateurs: null,
          ca_annuel: null,
          created_at: request.created_at,
          updated_at: request.updated_at,
          user_id: request.user_id || `cbam_${request.id}`, // ID factice pour les non-connectés
          email: request.email,
          phone: request.phone,
          address: addressMatch ? addressMatch[1].trim() : 'Non spécifiée',
          subscription: null,
          source: 'cbam',
          contact_name: nameMatch ? nameMatch[1].trim() : 'Non spécifié',
          cbam_emissions: emissionsMatch ? parseFloat(emissionsMatch[1]) : null
        };
      }) || [];
      
      const freeCalculatorOrganizations = freeCalculatorData?.map((request, index) => {
        // Extraire le secteur et l'adresse du message
        const message = request.message || '';
        const sectorMatch = message.match(/Secteur: ([^-]+)/);
        const addressMatch = message.match(/Adresse: (.+)/);
        
        return {
          id: request.id,
          nom_entreprise: request.company_name || 'Entreprise Inconnue',
          secteur: sectorMatch ? sectorMatch[1].trim() : 'Non spécifié',
          collaborateurs: null,
          ca_annuel: null,
          created_at: request.created_at,
          updated_at: request.updated_at,
          user_id: request.user_id || `free_${request.id}`, // ID factice pour les non-connectés
          email: request.email,
          phone: request.phone,
          address: addressMatch ? addressMatch[1].trim() : 'Non spécifiée',
          subscription: null,
          source: 'gratuit'
        };
      }) || [];

      // Combiner les données des profils (vraies inscriptions)
      const profileOrganizations = profilesData?.map(profile => {
        const subscription = subscriptionsData?.find(sub => sub.user_id === profile.user_id);
        const user = users.find(u => u.id === profile.user_id);
        
        // Force un nom d'organisation professionnel
        let organisationName = profile.company_name;
        
        // Si c'est "ABC Archibat", "mustapha kamel" ou contient des noms de personnes
        if (organisationName === 'ABC Archibat') {
          organisationName = 'Archibat';
        } else if (organisationName && (
          organisationName.toLowerCase().includes('mustapha') || 
          organisationName.toLowerCase().includes('kamel') ||
          organisationName.toLowerCase().includes('abc')
        )) {
          const email = user?.email || 'organisation@example.com';
          if (email.includes('archibat')) {
            organisationName = 'Archibat';
          } else {
            organisationName = 'Organisation Privée';
          }
        } else if (!organisationName || organisationName.trim() === '') {
          organisationName = 'Organisation Inconnue';
        }
        
        return {
          id: profile.id,
          nom_entreprise: organisationName,
          secteur: profile.sector,
          collaborateurs: profile.company_size === 'small' ? 10 : profile.company_size === 'medium' ? 50 : 100,
          ca_annuel: null,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          user_id: profile.user_id,
          email: user?.email || profile.phone || 'N/A',
          phone: profile.phone,
          subscription,
          source: 'inscription'
        };
      }) || [];

      // Combiner les données des entreprises (créées manuellement)
      const companyOrganizations = companiesData?.map(company => {
        const subscription = subscriptionsData?.find(sub => sub.user_id === company.user_id);
        const user = users.find(u => u.id === company.user_id);
        return {
          ...company,
          email: user?.email || 'N/A',
          phone: 'N/A',
          subscription,
          source: 'manuel'
        };
      }) || [];

      // Créer les organisations depuis les commandes validées
      const orderOrganizations = ordersData?.map(order => {
        const subscription = subscriptionsData?.find(sub => sub.user_id === order.user_id);
        const user = users.find(u => u.id === order.user_id);
        const userData = order.user_data as any;
        
        return {
          id: order.id,
          nom_entreprise: userData?.organization || userData?.company_name || userData?.name || 'Organisation Inconnue',
          secteur: userData?.sector || 'Non spécifié',
          collaborateurs: userData?.company_size ? parseInt(userData.company_size) : 10,
          ca_annuel: null,
          created_at: order.created_at,
          updated_at: order.updated_at,
          user_id: order.user_id || `order_${order.id}`,
          email: userData?.email || user?.email || 'N/A',
          phone: userData?.phone || 'N/A',
          subscription,
          source: 'commande'
        };
      }) || [];

      const managedClientOrganizations = MANAGED_CLIENT_ACCOUNTS.map(client => ({
        id: client.id,
        nom_entreprise: client.name,
        secteur: 'Non spécifié',
        collaborateurs: null,
        ca_annuel: null,
        created_at: '2026-08-12T00:00:00.000Z',
        updated_at: '2026-08-12T00:00:00.000Z',
        user_id: client.id,
        email: client.email,
        phone: client.phone,
        address: client.address,
        subscription: null,
        source: 'manuel',
      }));

      // Fusionner toutes les organisations
      const allOrganizations = [
        ...freeCalculatorOrganizations, 
        ...cbamCalculatorOrganizations, 
        ...profileOrganizations, 
        ...companyOrganizations,
        ...orderOrganizations,
        ...managedClientOrganizations,
      ].map(organization => {
        const originalName = organization.nom_entreprise;
        return {
          ...organization,
          nom_entreprise: resolveOrganizationDisplayName(originalName, organization.email),
          email: resolveOrganizationEmail(originalName, organization.email),
        };
      });

      // Les pistes calculateur et commandes restent des lignes distinctes ; seuls
      // les profils/entreprises sont dédupliqués par utilisateur.
      const uniqueOrganizations = deduplicateOrganizationRows(allOrganizations);

      setOrganizations(uniqueOrganizations);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les organisations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openOrganizationDetails = (organization: Organization) => {
    logger.debug('Opening organization details for:', organization.nom_entreprise);
    setSelectedOrganization(organization);
    setIsOrganizationDetailsOpen(true);
  };

  const openOrganizationDashboard = (organization: Organization) => {
    logger.debug('Opening dashboard for:', organization.nom_entreprise);
    setDashboardOrg(organization);
    setShowDashboard(true);
  };

  const closeOrganizationDetails = () => {
    setSelectedOrganization(null);
    setIsOrganizationDetailsOpen(false);
  };

  const adjustAssessments = async (userId: string, adjustment: number) => {
    try {
      const organization = organizations.find(org => org.user_id === userId);
      if (!organization?.subscription) return;

      const newUsed = Math.max(0, organization.subscription.assessments_used + adjustment);
      const maxLimit = organization.subscription.assessments_limit || 3;
      
      if (newUsed > maxLimit) {
        toast({
          title: "Erreur",
          description: "Le nombre de bilans utilisés ne peut pas dépasser la limite",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ assessments_used: newUsed })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Nombre de bilans ajusté: ${newUsed}/${maxLimit}`,
      });

      fetchOrganizations();
    } catch (error) {
      console.error('Error adjusting assessments:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajuster le nombre de bilans",
        variant: "destructive",
      });
    }
  };

  const resetAssessments = async (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir remettre à zéro le nombre de bilans utilisés pour cette organisation ?')) {
      try {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ assessments_used: 0 })
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Nombre de bilans remis à zéro",
        });

        fetchOrganizations();
      } catch (error) {
        console.error('Error resetting assessments:', error);
        toast({
          title: "Erreur",
          description: "Impossible de remettre à zéro les bilans",
          variant: "destructive",
        });
      }
    }
  };

  const upgradePlan = async (userId: string, currentPlan: string) => {
    logger.debug('Upgrading plan for user:', userId, 'from plan:', currentPlan);
    
    let newPlan: string;
    let newLimit: number;
    
    // Définir le plan supérieur
    switch (currentPlan) {
      case 'essentiel':
      case 'essential':
      case 'carbo_start':
      case 'start':
        newPlan = 'carbo_plus';
        newLimit = 10;
        break;
      case 'carbo_plus':
      case 'plus':
        newPlan = 'carbo_pro';
        newLimit = -1; // Illimité
        break;
      default:
        logger.debug('Plan not upgradeable:', currentPlan);
        toast({
          title: "Info",
          description: `Cette organisation a déjà le plan le plus élevé (${currentPlan})`,
        });
        return;
    }

    logger.debug('Upgrading from', currentPlan, 'to', newPlan);

    try {
      // Vérifier s'il existe déjà un abonnement
      const organization = organizations.find(org => org.user_id === userId);
      logger.debug('Found organization:', organization?.id);
      
      if (organization?.subscription) {
        logger.debug('Updating existing subscription:', organization.subscription.id);
        // Mettre à jour l'abonnement existant
        const { error, data } = await supabase
          .from('user_subscriptions')
          .update({ 
            plan_type: newPlan,
            assessments_limit: newLimit,
            assessments_used: 0, // Reset les bilans utilisés lors de l'upgrade
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 an
          })
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        logger.debug('Update successful');
      } else {
        logger.debug('Creating new subscription');
        // Créer un nouvel abonnement
        const { error, data } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_type: newPlan,
            status: 'active',
            assessments_limit: newLimit,
            assessments_used: 0,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 an
          })
          .select();

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }
        logger.debug('Insert successful');
      }

      toast({
        title: "Succès",
        description: `Plan amélioré de ${currentPlan} vers ${newPlan}`,
      });

      logger.debug('Refreshing organizations...');
      await fetchOrganizations();
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'améliorer le plan: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.nom_entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.secteur?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading) {
    return <div>Chargement des organisations...</div>;
  }

  if (showDashboard && dashboardOrg) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowDashboard(false)}
          className="mb-4"
        >
          ← Retour aux organisations
        </Button>
        <OrganizationDashboard organizationName={dashboardOrg.nom_entreprise} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des organisations</h2>
          <p className="text-muted-foreground">
            Gérer les organisations clientes et leurs abonnements
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Rechercher une organisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organisations</CardTitle>
          <CardDescription>
            {filteredOrganizations.length} organisation(s) trouvée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Plan actuel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.nom_entreprise || 'Organisation non définie'}</TableCell>
                  <TableCell>{org.email || 'N/A'}</TableCell>
                  <TableCell>{org.phone || 'N/A'}</TableCell>
                  <TableCell>{org.secteur || 'Non défini'}</TableCell>
                  <TableCell>{org.address || 'Non spécifiée'}</TableCell>
                  <TableCell>
                    {org.source === 'gratuit' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Gratuit
                      </Badge>
                    ) : org.source === 'cbam' ? (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        CBAM
                      </Badge>
                    ) : org.subscription ? (
                      <Badge variant="outline">{org.subscription.plan_type}</Badge>
                    ) : (
                      <Badge variant="secondary">Essentiel</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.source === 'gratuit' ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Calculateur gratuit
                      </Badge>
                    ) : org.source === 'cbam' ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Calculateur CBAM
                      </Badge>
                    ) : org.subscription ? (
                      <Badge 
                        variant={
                          org.subscription.status === 'active' ? 'default' : 
                          org.subscription.status === 'suspended' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {org.subscription.status === 'active' ? 'Actif' : 
                         org.subscription.status === 'suspended' ? 'Suspendu' : 'Expiré'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOrganizationDetails(org)}
                        title="Voir les détails et gérer les modules"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOrganizationDashboard(org)}
                        title="Voir le dashboard"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <OrganizationPlanMenu
                        userId={org.user_id}
                        organizationName={org.nom_entreprise || 'Organisation'}
                        currentPlan={org.subscription?.plan_type}
                        currentStatus={org.subscription?.status}
                        readOnly={isReadOnly}
                        onChanged={fetchOrganizations}
                      />
                      {!isReadOnly && <DeleteOrganizationDialog
                        organization={{
                          id: org.id,
                          nom_entreprise: org.nom_entreprise || 'Organisation',
                          user_id: org.user_id,
                          source: org.source,
                        }}
                        onDeleted={fetchOrganizations}
                      />}
                    </div>

                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de détails de l'organisation */}
      <Dialog open={isOrganizationDetailsOpen} onOpenChange={setIsOrganizationDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Détails de l'organisation
            </DialogTitle>
            <DialogDescription>
              Informations complètes et gestion des bilans
            </DialogDescription>
          </DialogHeader>

          {selectedOrganization && (
            <div className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nom de l'organisation</Label>
                      <p className="text-base font-medium">{selectedOrganization.nom_entreprise || 'Non défini'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Secteur d'activité</Label>
                      <p className="text-base">{selectedOrganization.secteur || 'Non défini'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-base">{selectedOrganization.email || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Téléphone</Label>
                      <p className="text-base">{selectedOrganization.phone || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gestion des bilans */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gestion des bilans carbone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedOrganization.subscription ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Bilans utilisés</Label>
                          <div className="mt-1">
                            <Badge 
                              variant={
                                selectedOrganization.subscription.assessments_used >= selectedOrganization.subscription.assessments_limit 
                                  ? 'destructive' 
                                  : 'default'
                              }
                              className="text-lg px-4 py-2"
                            >
                              {selectedOrganization.subscription.assessments_used || 0} / {selectedOrganization.subscription.assessments_limit || 3}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => adjustAssessments(selectedOrganization.user_id, -1)}
                            disabled={!selectedOrganization.subscription?.assessments_used}
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Diminuer de 1
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => resetAssessments(selectedOrganization.user_id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Remettre à zéro
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Aucun abonnement actif - Aucun bilan disponible</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gestion des tokens rapport */}
              <TokenQuotaManager 
                organizationId={selectedOrganization.id}
                organizationName={selectedOrganization.nom_entreprise}
              />

              {/* Gestion des modules */}
              <OrganizationModulesManager 
                userId={selectedOrganization.user_id}
                organizationName={selectedOrganization.nom_entreprise}
              />

              {/* Gestion des années */}
              <OrganizationYearsManager
                userId={selectedOrganization.user_id}
                organizationName={selectedOrganization.nom_entreprise}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeOrganizationDetails}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
