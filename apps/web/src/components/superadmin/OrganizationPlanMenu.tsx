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
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface Props {
  userId: string;
  organizationName: string;
  currentPlan?: string;
  currentStatus?: string;
  readOnly?: boolean;
  onChanged: () => void;
}

const PLAN_OPTIONS = [
  { value: "essential", label: "Essentiel", limit: 1 },
  { value: "carbo_plus", label: "Carbo Plus", limit: 2 },
  { value: "carbo_pro", label: "Pro", limit: 3 },
  { value: "complete", label: "Expert (illimité)", limit: -1 },
];

export const OrganizationPlanMenu: React.FC<Props> = ({
  userId,
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

  const isFakeUser = !userId || userId.startsWith("free_") || userId.startsWith("cbam_") || userId.startsWith("order_");

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
    if (isFakeUser) {
      toast({ title: "Action impossible", description: "Ce contact n'a pas encore de compte utilisateur lié.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const planMeta = PLAN_OPTIONS.find((p) => p.value === selectedPlan)!;
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const { data: existing } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            plan_type: selectedPlan,
            status: "active",
            assessments_limit: planMeta.limit,
            expires_at: expires,
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_subscriptions").insert({
          user_id: userId,
          plan_type: selectedPlan,
          status: "active",
          assessments_limit: planMeta.limit,
          assessments_used: 0,
          expires_at: expires,
        });
        if (error) throw error;
      }

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

  const confirmPayment = async () => {
    if (readOnly) {
      notifyReadOnly();
      return;
    }
    if (isFakeUser) {
      toast({ title: "Action impossible", description: "Aucun compte utilisateur lié à cette organisation.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: pendingOrders, error: fetchErr } = await supabase
        .from("orders")
        .select("id, plan_type")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      if (!pendingOrders || pendingOrders.length === 0) {
        toast({ title: "Aucun paiement en attente", description: "Aucune commande à valider pour cette organisation." });
        return;
      }

      const latest = pendingOrders[0];
      const { error } = await supabase
        .from("orders")
        .update({
          status: "validated",
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
        })
        .eq("id", latest.id);
      if (error) throw error;

      // Activer l'abonnement correspondant
      const planMeta = PLAN_OPTIONS.find((p) => p.value === latest.plan_type) || PLAN_OPTIONS[0];
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("user_subscriptions")
          .update({ plan_type: latest.plan_type, status: "active", assessments_limit: planMeta.limit, expires_at: expires })
          .eq("user_id", userId);
      } else {
        await supabase.from("user_subscriptions").insert({
          user_id: userId, plan_type: latest.plan_type, status: "active",
          assessments_limit: planMeta.limit, assessments_used: 0, expires_at: expires,
        });
      }

      toast({ title: "Paiement confirmé", description: `Plan ${planMeta.label} activé pour ${organizationName}` });
      onChanged();
    } catch (e: any) {
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
    if (isFakeUser) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ status: newStatus })
        .eq("user_id", userId);
      if (error) throw error;
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
          <Button variant="outline" size="sm" title="Gestion du plan">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background z-50">
          <DropdownMenuLabel>Gestion du plan</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openPlanDialog}>
            <CreditCard className="h-4 w-4 mr-2" />
            Changer / activer un plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={confirmPayment} disabled={loading}>
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            Confirmer paiement
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {currentStatus === "suspended" ? (
            <DropdownMenuItem onClick={() => toggleStatus("active")} disabled={loading}>
              <Play className="h-4 w-4 mr-2 text-green-600" />
              Réactiver l'abonnement
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toggleStatus("suspended")} disabled={!readOnly && (loading || !currentPlan)}>
              <Ban className="h-4 w-4 mr-2 text-orange-600" />
              Suspendre l'abonnement
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le plan</DialogTitle>
            <DialogDescription>{organizationName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nouveau plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              L'abonnement sera activé immédiatement pour 1 an. Le compteur de bilans est conservé.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Annuler</Button>
            <Button onClick={applyPlan} disabled={loading}>Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
