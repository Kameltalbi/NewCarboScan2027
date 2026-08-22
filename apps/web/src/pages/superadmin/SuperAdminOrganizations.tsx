import React, { useEffect, useState } from "react";
import { logger } from '@/utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, BarChart3, Minus, RotateCcw, Download } from "lucide-react";
import { OrganizationDashboard } from "@/components/dashboard/OrganizationDashboard";
import { OrganizationModulesManager } from "@/components/superadmin/OrganizationModulesManager";
import { TokenQuotaManager } from "@/components/superadmin/TokenQuotaManager";
import { OrganizationYearsManager } from "@/components/superadmin/OrganizationYearsManager";
import { DeleteOrganizationDialog } from "@/components/superadmin/DeleteOrganizationDialog";
import { SuspendOrganizationDialog } from "@/components/superadmin/SuspendOrganizationDialog";
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
  status?: "active" | "suspended";
  suspendedReason?: string | null;
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
      const { items } = await api.adminListOrganizations();
      const mapped: Organization[] = items.map((org) => ({
        id: org.id,
        nom_entreprise: org.name,
        secteur: org.sector || 'Non spécifié',
        collaborateurs: org.memberCount,
        ca_annuel: null as unknown as number,
        created_at: org.createdAt,
        user_id: org.owner?.id || '',
        email: org.owner?.email || undefined,
        address: org.country || undefined,
        source: 'tenant',
        status: org.status,
        suspendedReason: org.suspendedReason,
        subscription: {
          id: org.id,
          plan_type: org.subscriptionPlan || 'essentiel',
          status: org.status === 'suspended' ? 'suspended' : (org.subscriptionStatus || 'active'),
          expires_at: '',
          assessments_used: 0,
          assessments_limit: 3,
        },
      }));
      setOrganizations(mapped);
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

  const notifyNotPorted = () => {
    toast({
      title: "Non disponible",
      description: "La gestion des quotas de bilans n'est pas encore branchée sur PostgreSQL.",
    });
  };

  const adjustAssessments = async () => notifyNotPorted();
  const resetAssessments = async () => notifyNotPorted();

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.nom_entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.secteur?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const csvCell = (value: string | number | null | undefined) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const statusLabel = (org: Organization) =>
    org.status === 'suspended' ? 'Suspendue' : 'Active';

  const exportOrganizations = () => {
    if (filteredOrganizations.length === 0) {
      toast({
        title: 'Rien à exporter',
        description: 'Aucune organisation ne correspond à la recherche.',
      });
      return;
    }
    const headers = [
      'Organisation',
      'Email',
      'Téléphone',
      'Secteur',
      'Pays',
      'Plan',
      'Statut',
      'Membres',
      'Créée le',
      'Motif de suspension',
      'ID',
    ];
    const rows = filteredOrganizations.map((org) => [
      csvCell(org.nom_entreprise),
      csvCell(org.email || ''),
      csvCell(org.phone || ''),
      csvCell(org.secteur || ''),
      csvCell(org.address || ''),
      csvCell(org.subscription?.plan_type || ''),
      csvCell(statusLabel(org)),
      csvCell(org.collaborateurs ?? ''),
      csvCell(org.created_at ? new Date(org.created_at).toLocaleDateString('fr-FR') : ''),
      csvCell(org.suspendedReason || ''),
      csvCell(org.id),
    ].join(';'));
    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `organisations-carboscan-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Export téléchargé',
      description: `${filteredOrganizations.length} organisation(s) exportée(s).`,
    });
  };

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
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestion des organisations</h2>
          <p className="text-muted-foreground">
            Gérer les organisations clientes et leurs abonnements
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportOrganizations}
          disabled={filteredOrganizations.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exporter la liste
        </Button>
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
                    {org.status === 'suspended' ? (
                      <Badge variant="secondary">Suspendue</Badge>
                    ) : org.subscription?.status === 'active' ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">{org.subscription?.status || 'Active'}</Badge>
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
                      {!isReadOnly && (
                        <SuspendOrganizationDialog
                          organization={{
                            id: org.id,
                            nom_entreprise: org.nom_entreprise || 'Organisation',
                            status: org.status,
                          }}
                          onChanged={fetchOrganizations}
                        />
                      )}
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
                organizationId={selectedOrganization.id}
                organizationName={selectedOrganization.nom_entreprise}
              />

              {/* Gestion des années */}
              <OrganizationYearsManager
                organizationId={selectedOrganization.id}
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
