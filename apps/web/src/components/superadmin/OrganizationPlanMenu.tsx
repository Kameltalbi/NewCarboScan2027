import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle2, Ban, Play, MoreVertical } from "lucide-react";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface Props {
  organizationId: string;
  organizationName: string;
  userId?: string;
  currentPlan?: string;
  currentStatus?: string;
  readOnly?: boolean;
  onChanged: () => void;
}

const PLAN_OPTIONS = [
  { value: "essential", label: "Essentiel" },
  { value: "carbo_plus", label: "Carbo Plus" },
  { value: "carbo_pro", label: "Pro" },
  { value: "complete", label: "Expert (illimité)" },
];

export const OrganizationPlanMenu: React.FC<Props> = ({
  organizationId,
  organizationName,
  currentPlan,
  currentStatus,
  readOnly = false,
  onChanged,
}) => {
  const { toast } = useToast();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan || "essential");
  const [loading, setLoading] = useState(false);

  const notifyReadOnly = () => {
    toast({
      title: "Accès en lecture seule",
      description: "Vous n’avez pas les droits nécessaires pour modifier cette organisation.",
    });
  };

  const openPlanDialog = () => {
    if (readOnly) {
      notifyReadOnly();
      return;
    }
    setSelectedPlan(currentPlan || "essential");
    setPlanDialogOpen(true);
  };

  const applyPlan = async () => {
    if (readOnly) {
      notifyReadOnly();
      return;
    }
    setLoading(true);
    try {
      const planMeta = PLAN_OPTIONS.find((p) => p.value === selectedPlan)!;
      await api.adminSetOrgPlan(organizationId, selectedPlan, "active");
      toast({ title: "Plan mis à jour", description: `${organizationName} → ${planMeta.label}` });
      setPlanDialogOpen(false);
      onChanged();
    } catch (e: any) {
      logger.error("plan update failed", e);
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (newStatus: "active" | "suspended") => {
    if (readOnly) {
      notifyReadOnly();
      return;
    }
    setLoading(true);
    try {
      await api.adminSetOrgPlan(organizationId, currentPlan || "essential", newStatus);
      toast({ title: newStatus === "active" ? "Réactivé" : "Suspendu", description: organizationName });
      onChanged();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Abonnement</DropdownMenuLabel>
          <DropdownMenuItem onClick={openPlanDialog}>
            <CreditCard className="h-4 w-4 mr-2" /> Changer le plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {currentStatus === "suspended" ? (
            <DropdownMenuItem onClick={() => toggleStatus("active")}>
              <Play className="h-4 w-4 mr-2" /> Réactiver
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toggleStatus("suspended")}>
              <Ban className="h-4 w-4 mr-2" /> Suspendre l'abonnement
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan — {organizationName}</DialogTitle>
            <DialogDescription>Choisir le plan d'abonnement PostgreSQL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Annuler</Button>
            <Button onClick={applyPlan} disabled={loading}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
