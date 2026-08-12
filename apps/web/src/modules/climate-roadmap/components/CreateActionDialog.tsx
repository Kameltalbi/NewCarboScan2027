import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

interface CreateActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const INITIAL_STATE = {
  titre: '', description: '', categorie: 'Énergie',
  scope_cible: 'tous' as const, priorite: 'moyenne' as const,
  impact_estime_pourcent: '5-10%',
};

export const CreateActionDialog: React.FC<CreateActionDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const [form, setForm] = useState(INITIAL_STATE);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from('actions_recommandees').insert({
        titre: form.titre.trim(),
        description: form.description.trim() || form.titre.trim(),
        categorie: form.categorie,
        scope_cible: form.scope_cible,
        priorite: form.priorite,
        impact_estime_pourcent: form.impact_estime_pourcent,
        seuil_emission_kgco2e: 0,
      });
      if (error) throw error;
      toast.success('Action créée avec succès !');
      setForm(INITIAL_STATE);
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Plus className="h-5 w-5 text-primary" />
          Créer une action personnalisée
        </DialogTitle>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ca-titre">Titre de l'action *</Label>
            <Input id="ca-titre" placeholder="Ex: Installer des panneaux solaires" value={form.titre}
              onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ca-desc">Description</Label>
            <Textarea id="ca-desc" placeholder="Décrivez l'action, les résultats attendus…" rows={3}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.categorie} onValueChange={v => setForm(p => ({ ...p, categorie: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Énergie', 'Mobilité', 'Achats', 'Déchets', 'Bâtiment', 'Sensibilisation'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope cible</Label>
              <Select value={form.scope_cible} onValueChange={v => setForm(p => ({ ...p, scope_cible: v as typeof INITIAL_STATE.scope_cible }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les scopes</SelectItem>
                  <SelectItem value="1">Scope 1</SelectItem>
                  <SelectItem value="2">Scope 2</SelectItem>
                  <SelectItem value="3">Scope 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={form.priorite} onValueChange={v => setForm(p => ({ ...p, priorite: v as typeof INITIAL_STATE.priorite }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="haute">🔴 Haute</SelectItem>
                  <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                  <SelectItem value="basse">🟢 Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impact estimé</Label>
              <Select value={form.impact_estime_pourcent} onValueChange={v => setForm(p => ({ ...p, impact_estime_pourcent: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5%">1-5%</SelectItem>
                  <SelectItem value="5-10%">5-10%</SelectItem>
                  <SelectItem value="10-20%">10-20%</SelectItem>
                  <SelectItem value="20-40%">20-40%</SelectItem>
                  <SelectItem value="40%+">40%+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button size="sm" disabled={!form.titre.trim()} onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Créer l'action
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
