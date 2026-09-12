import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowRight, Check, Sparkles, Clock, DollarSign, ShieldCheck } from 'lucide-react';
import { supabase, sessionAuth} from "@/integrations/api/client";
import { toast } from 'sonner';
import { RecommendedAction } from '@/lib/recommendedActions';
import { CircleGauge } from './CircleGauge';

interface AIEstimation {
  reduction_kgco2e: number;
  reduction_percent: number;
  confidence: 'haute' | 'moyenne' | 'basse';
  justification: string;
  horizon_mois: number;
  cout_estime: 'faible' | 'moyen' | 'élevé';
}

const getImplementationSteps = (action: RecommendedAction): string[] => {
  const stepsMap: Record<string, string[]> = {
    'Énergie': [
      "Réaliser un audit énergétique des installations et identifier les postes les plus consommateurs",
      "Comparer les offres d'énergie renouvelable disponibles et évaluer le retour sur investissement",
      "Mettre en place un plan de suivi des consommations avec des indicateurs mensuels",
      "Former les équipes aux éco-gestes et bonnes pratiques de sobriété énergétique"
    ],
    'Mobilité': [
      "Identifier les trajets pouvant être évités et s'accorder avec les participants aux réunions sur une solution de visioconférence",
      "Estimer les économies carbone et monétaire réalisées en évitant le transport",
      "S'accorder avec les partenaires/collègues habituellement rencontrés en physique pour planifier le rendez-vous en visioconférence",
      "Identifier les solutions bas-carbone de visioconférence de votre choix"
    ],
    'Achats': [
      "Cartographier les fournisseurs et évaluer leur empreinte carbone",
      "Définir des critères environnementaux dans les appels d'offres",
      "Privilégier les fournisseurs locaux et les matériaux recyclés ou bas-carbone",
      "Mettre en place un suivi des achats responsables avec des KPIs dédiés"
    ],
    'Déchets': [
      "Réaliser un diagnostic des flux de déchets par type et par site",
      "Mettre en place le tri sélectif et identifier les filières de valorisation",
      "Sensibiliser les collaborateurs à la réduction des déchets à la source",
      "Suivre les taux de recyclage et fixer des objectifs d'amélioration annuels"
    ],
  };
  return stepsMap[action.categorie] || [
    "Évaluer la situation actuelle et identifier les axes d'amélioration prioritaires",
    "Définir un plan d'action avec des objectifs mesurables et un calendrier",
    "Impliquer les parties prenantes et communiquer sur les enjeux",
    "Suivre les résultats et ajuster la stratégie en continu"
  ];
};

interface ActionDetailPopupProps {
  action: RecommendedAction;
  pertinence: number;
  bilan: { totalEmissions: number; scope1: number; scope2: number; scope3: number } | null;
  onClose: () => void;
}

export const ActionDetailPopup: React.FC<ActionDetailPopupProps> = ({ action, pertinence, bilan, onClose }) => {
  const [status, setStatus] = useState('a_prioriser');
  const [responsable, setResponsable] = useState('');
  const [dateButtoire, setDateButtoire] = useState('');
  const [notes, setNotes] = useState('');
  const [impactKgCO2e, setImpactKgCO2e] = useState('0');
  const [aiEstimation, setAiEstimation] = useState<AIEstimation | null>(null);
  const [estimating, setEstimating] = useState(false);

  const handleEstimate = async () => {
    if (!bilan) {
      toast.error("Aucun bilan carbone disponible pour l'estimation");
      return;
    }
    setEstimating(true);
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/estimate-action-impact`;
      const { data: sessionData } = await sessionAuth.getSession();
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action, bilan }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Erreur ${response.status} lors de l'estimation`);
      if (!payload?.estimation) throw new Error("Réponse d'estimation invalide");
      setAiEstimation(payload.estimation);
      setImpactKgCO2e(String(Math.round(payload.estimation.reduction_kgco2e)));
      toast.success("Estimation IA calculée !");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de l'estimation IA";
      toast.error(message);
    } finally {
      setEstimating(false);
    }
  };

  const faisabilite = action.priorite === 'haute' ? 'Facile' : action.priorite === 'moyenne' ? 'Modérée' : 'Complexe';
  const impactLevel = action.impact_estime_pourcent === 'Non quantifié' ? 'Non quantifié'
    : action.impact_estime_pourcent === 'Variable' ? 'Variable' : 'Important';
  const steps = getImplementationSteps(action);

  return (
    <div className="flex flex-col md:flex-row gap-6 max-h-[80vh]">
      {/* Left: content */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-0 md:pr-2">
        <Badge variant="outline" className="text-xs gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          {action.categorie}
        </Badge>
        <h2 className="text-lg font-bold text-foreground leading-snug">{action.titre}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            💡 Comment mettre en place cette action ?
          </h3>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            {steps.map((step, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a_prioriser" className="text-xs">📋 A prioriser</SelectItem>
                <SelectItem value="en_cours" className="text-xs">🔄 En cours</SelectItem>
                <SelectItem value="complete" className="text-xs">✅ Complété</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Responsable</Label>
            <Input className="h-9 text-xs" placeholder="👤 Non-assigné" value={responsable} onChange={e => setResponsable(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Date butoire</Label>
            <Input type="date" className="h-9 text-xs" value={dateButtoire} onChange={e => setDateButtoire(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Notes</Label>
          <Textarea className="text-xs min-h-[60px]" placeholder="Écrivez vos notes liées à l'action ici" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Right: metrics sidebar */}
      <div className="w-full md:w-60 shrink-0 space-y-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Efficacité de l'action</p>
              <button className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">ℹ️ Méthodologie</button>
            </div>
            <CircleGauge value={pertinence} size={56} />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs italic text-muted-foreground">Estimation de la faisabilité</p>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${faisabilite === 'Facile' ? 'bg-emerald-500' : faisabilite === 'Modérée' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-foreground">{faisabilite}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs italic text-muted-foreground">Estimation de l'impact</p>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${impactLevel === 'Important' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="text-sm font-medium text-foreground">{impactLevel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Input type="number" className="h-9 text-sm flex-1" value={impactKgCO2e} onChange={e => setImpactKgCO2e(e.target.value)} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">kgCO2e</span>
          </div>

          <Separator />

          {aiEstimation ? (
            <div className="space-y-3 p-3 border-2 border-primary/20 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold text-foreground">Estimation IA</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Réduction estimée</span>
                  <span className="text-sm font-bold text-primary">{Math.round(aiEstimation.reduction_kgco2e).toLocaleString()} kgCO₂e</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Soit</span>
                  <span className="text-sm font-semibold text-foreground">-{aiEstimation.reduction_percent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Effet en {aiEstimation.horizon_mois} mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Coût : {aiEstimation.cout_estime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Confiance : {aiEstimation.confidence}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic leading-relaxed border-t border-border pt-2">{aiEstimation.justification}</p>
              <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={handleEstimate} disabled={estimating}>
                {estimating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Recalculer
              </Button>
            </div>
          ) : (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">Calculateur IA</p>
                </div>
                <p className="text-xs text-muted-foreground">Estimez l'impact CO₂ de cette action avec l'IA !</p>
                <Button size="sm" className="gap-1 text-xs" onClick={handleEstimate} disabled={estimating}>
                  {estimating ? <><Loader2 className="h-3 w-3 animate-spin" /> Calcul en cours…</> : <>Estimer <ArrowRight className="h-3 w-3" /></>}
                </Button>
              </CardContent>
            </Card>
          )}

          <Separator />

          <button className="w-full flex items-center justify-between p-3 border rounded-[4px] hover:bg-accent/50 transition-colors">
            <span className="text-sm font-bold text-foreground">Certifier cette action</span>
            <Check className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
