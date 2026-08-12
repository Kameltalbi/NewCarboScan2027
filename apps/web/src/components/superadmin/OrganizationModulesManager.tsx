import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, BarChart3, Leaf, Database, Zap, Shield, Target, Users } from "lucide-react";

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isActive: boolean;
}

interface OrganizationModulesManagerProps {
  userId: string;
  organizationName: string;
  onClose?: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Leaf: <Leaf className="h-5 w-5" />,
  Database: <Database className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
};

export const OrganizationModulesManager: React.FC<OrganizationModulesManagerProps> = ({
  userId,
  organizationName,
  onClose
}) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchModulesAndStatus();
  }, [userId]);

  const fetchModulesAndStatus = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer TOUS les modules actifs (pas seulement core) pour le superadmin
      const { data: allModules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (modulesError) throw modulesError;

      // Récupérer ou créer l'organisation de l'utilisateur
      let { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (orgError && orgError.code !== 'PGRST116') throw orgError;

      // Si pas d'organisation, en créer une
      if (!orgData) {
        const { data: newOrg, error: createOrgError } = await supabase
          .from('organizations')
          .insert({ user_id: userId, name: organizationName })
          .select('id')
          .single();

        if (createOrgError) throw createOrgError;
        orgData = newOrg;
      }

      setOrganizationId(orgData?.id || null);

      // Récupérer les modules activés pour cette organisation
      let activeModuleIds: string[] = [];
      if (orgData?.id) {
        const { data: orgModules, error: orgModulesError } = await supabase
          .from('organization_modules')
          .select('module_id')
          .eq('org_id', orgData.id)
          .eq('active', true);

        if (orgModulesError) throw orgModulesError;
        activeModuleIds = orgModules?.map(m => m.module_id) || [];
      }

      // Combiner les données
      const modulesWithStatus = allModules?.map(mod => ({
        id: mod.id,
        slug: mod.slug,
        name: mod.name,
        description: mod.description || '',
        icon: mod.icon || 'Package',
        category: mod.category || 'core',
        isActive: activeModuleIds.includes(mod.id)
      })) || [];

      setModules(modulesWithStatus);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les modules",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = async (moduleSlug: string, isActive: boolean) => {
    if (!organizationId) {
      toast({
        title: "Erreur",
        description: "Organisation non trouvée",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(moduleSlug);
    try {
      if (isActive) {
        // Activer le module
        const { error } = await supabase.rpc('activate_module_for_organization', {
          p_org_id: organizationId,
          p_module_slug: moduleSlug
        });

        if (error) throw error;
      } else {
        // Désactiver le module
        const { error } = await supabase.rpc('deactivate_module_for_organization', {
          p_org_id: organizationId,
          p_module_slug: moduleSlug
        });

        if (error) throw error;
      }

      // Mettre à jour l'état local
      setModules(prev => prev.map(mod => 
        mod.slug === moduleSlug ? { ...mod, isActive } : mod
      ));

      toast({
        title: "Succès",
        description: isActive 
          ? `Module "${moduleSlug}" activé` 
          : `Module "${moduleSlug}" désactivé`,
      });
    } catch (error) {
      console.error('Error toggling module:', error);
      toast({
        title: "Erreur",
        description: `Impossible de modifier le module: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const activateAllModules = async () => {
    if (!organizationId) return;

    setIsSaving('all');
    try {
      for (const mod of modules) {
        if (!mod.isActive) {
          await supabase.rpc('activate_module_for_organization', {
            p_org_id: organizationId,
            p_module_slug: mod.slug
          });
        }
      }

      setModules(prev => prev.map(mod => ({ ...mod, isActive: true })));

      toast({
        title: "Succès",
        description: "Tous les modules ont été activés",
      });
    } catch (error) {
      console.error('Error activating all modules:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer tous les modules",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCount = modules.filter(m => m.isActive).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des modules</CardTitle>
            <CardDescription>
              {activeCount}/{modules.length} module(s) activé(s) pour {organizationName}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={activateAllModules}
            disabled={isSaving === 'all' || activeCount === modules.length}
          >
            {isSaving === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Activer tous
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.map((mod) => (
          <div 
            key={mod.id} 
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                {iconMap[mod.icon] || <Package className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={mod.slug} className="font-medium cursor-pointer">
                    {mod.name}
                  </Label>
                  {mod.category && (
                    <Badge variant="outline" className="text-xs">
                      {mod.category === 'core' ? 'Core' : 
                       mod.category === 'addon' ? 'Addon' :
                       mod.category === 'landing' ? 'Landing' :
                       mod.category === 'technical' ? 'Technique' :
                       mod.category}
                    </Badge>
                  )}
                  {mod.isActive && (
                    <Badge variant="default" className="text-xs">Actif</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {mod.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving === mod.slug && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id={mod.slug}
                checked={mod.isActive}
                onCheckedChange={(checked) => toggleModule(mod.slug, checked)}
                disabled={isSaving !== null}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
