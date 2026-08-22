import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/integrations/api/client";
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
  organizationId: string;
  organizationName: string;
  userId?: string;
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
  organizationId,
  organizationName,
  onClose
}) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchModulesAndStatus();
  }, [organizationId]);

  const fetchModulesAndStatus = async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const { items } = await api.adminListOrgModules(organizationId);
      setModules(
        (items || []).map((mod) => ({
          id: mod.module_id,
          slug: mod.slug,
          name: mod.name,
          description: mod.description || "",
          icon: "Package",
          category: "core",
          isActive: !!mod.enabled,
        })),
      );
    } catch (error) {
      console.error("Error fetching modules:", error);
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
    setIsSaving(moduleSlug);
    try {
      await api.adminToggleOrgModule(organizationId, moduleSlug, isActive);
      setModules((prev) =>
        prev.map((mod) => (mod.slug === moduleSlug ? { ...mod, isActive } : mod)),
      );
      toast({
        title: "Succès",
        description: isActive
          ? `Module "${moduleSlug}" activé`
          : `Module "${moduleSlug}" désactivé`,
      });
    } catch (error: any) {
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
    setIsSaving("all");
    try {
      for (const mod of modules) {
        if (!mod.isActive) {
          await api.adminToggleOrgModule(organizationId, mod.slug, true);
        }
      }
      setModules((prev) => prev.map((mod) => ({ ...mod, isActive: true })));
      toast({
        title: "Succès",
        description: "Tous les modules ont été activés",
      });
    } catch (error) {
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Modules — {organizationName}
        </CardTitle>
        <CardDescription>Activer ou désactiver les modules de cette organisation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" size="sm" onClick={activateAllModules} disabled={isSaving === "all"}>
          {isSaving === "all" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Tout activer
        </Button>
        <div className="space-y-3">
          {modules.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
              <div className="flex items-center gap-3">
                {iconMap[mod.icon] || <Package className="h-5 w-5" />}
                <div>
                  <div className="font-medium">{mod.name}</div>
                  <div className="text-xs text-muted-foreground">{mod.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={mod.isActive ? "default" : "secondary"}>
                  {mod.isActive ? "Actif" : "Off"}
                </Badge>
                <Switch
                  checked={mod.isActive}
                  disabled={isSaving === mod.slug}
                  onCheckedChange={(checked) => toggleModule(mod.slug, checked)}
                />
              </div>
            </div>
          ))}
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        )}
      </CardContent>
    </Card>
  );
};
