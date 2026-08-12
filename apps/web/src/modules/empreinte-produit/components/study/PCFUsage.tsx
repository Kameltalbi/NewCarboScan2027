// Phase d'utilisation du produit
import React from 'react';
import { usePCFUsage } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';

const PCFUsage: React.FC<{ studyId: string; locked?: boolean }> = ({ studyId, locked = false }) => {
  const { data: rows, isLoading, insert, update } = usePCFUsage(studyId);
  const usage = rows?.[0];

  const [form, setForm] = React.useState({
    lifetime_years: usage?.lifetime_years || '',
    uses_per_year: usage?.uses_per_year || '',
    consumption_per_use: usage?.consumption_per_use || '',
    consumption_unit: usage?.consumption_unit || 'kWh',
  });

  React.useEffect(() => {
    if (usage) {
      setForm({
        lifetime_years: usage.lifetime_years || '',
        uses_per_year: usage.uses_per_year || '',
        consumption_per_use: usage.consumption_per_use || '',
        consumption_unit: usage.consumption_unit || 'kWh',
      });
    }
  }, [usage]);

  const handleSave = () => {
    const payload = {
      study_id: studyId,
      lifetime_years: form.lifetime_years ? parseFloat(String(form.lifetime_years)) : null,
      uses_per_year: form.uses_per_year ? parseFloat(String(form.uses_per_year)) : null,
      consumption_per_use: form.consumption_per_use ? parseFloat(String(form.consumption_per_use)) : null,
      consumption_unit: form.consumption_unit,
      is_estimated: false,
    };
    if (usage) {
      update.mutate({ id: usage.id, ...payload });
    } else {
      insert.mutate(payload);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Phase d'utilisation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Consommation d'énergie du produit pendant sa durée de vie (si applicable).
        </p>
      </div>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Durée de vie (années)</Label>
            <Input type="number" value={form.lifetime_years} onChange={e => setForm({ ...form, lifetime_years: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Utilisations par an</Label>
            <Input type="number" value={form.uses_per_year} onChange={e => setForm({ ...form, uses_per_year: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Consommation par utilisation</Label>
            <Input type="number" value={form.consumption_per_use} onChange={e => setForm({ ...form, consumption_per_use: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Unité</Label>
            <Input value={form.consumption_unit} onChange={e => setForm({ ...form, consumption_unit: e.target.value })} />
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2" disabled={update.isPending || insert.isPending || locked}>
          <Save className="w-4 h-4" /> {locked ? 'Verrouillé' : 'Enregistrer'}
        </Button>
      </Card>
    </div>
  );
};

export default PCFUsage;
