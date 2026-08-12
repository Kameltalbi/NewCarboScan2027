// Section Paramétrage d'une étude PCF
import React from 'react';
import { useForm } from 'react-hook-form';
import { useUpdatePCFStudy } from '../../hooks/usePCFStudy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import type { PCFStudy } from '../../types';

const PCFParametrage: React.FC<{ study: PCFStudy }> = ({ study }) => {
  const updateMutation = useUpdatePCFStudy();
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      name: study.name,
      product_category: study.product_category,
      description: study.description || '',
      sector: study.sector || '',
      production_site: study.production_site || '',
      country: study.country || '',
      electricity_mix: study.electricity_mix || '',
      functional_unit: study.functional_unit,
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({ id: study.id, ...data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Paramétrage du produit</h2>
        <Button type="submit" size="sm" className="gap-2" disabled={updateMutation.isPending}>
          <Save className="w-4 h-4" /> Enregistrer
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom du produit</Label>
            <Input {...register('name')} />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select defaultValue={study.product_category} onValueChange={(v) => setValue('product_category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['industriel', 'alimentaire', 'textile', 'electronique', 'construction', 'chimique', 'produit', 'service', 'ciment', 'acier-fer', 'aluminium', 'engrais', 'hydrogene', 'electricite', 'autre'].map(c =>
                  <SelectItem key={c} value={c} className="capitalize">{
                    { ciment: 'Ciment (CBAM)', 'acier-fer': 'Fer & Acier (CBAM)', aluminium: 'Aluminium (CBAM)', engrais: 'Engrais (CBAM)', hydrogene: 'Hydrogène (CBAM)', electricite: 'Électricité (CBAM)' }[c] || c
                  }</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...register('description')} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Secteur</Label><Input {...register('sector')} /></div>
          <div className="space-y-2"><Label>Site de production</Label><Input {...register('production_site')} /></div>
          <div className="space-y-2"><Label>Pays</Label><Input {...register('country')} /></div>
          <div className="space-y-2"><Label>Mix électrique</Label><Input {...register('electricity_mix')} /></div>
        </div>
        <div className="space-y-2">
          <Label>Unité fonctionnelle</Label>
          <Input {...register('functional_unit')} />
        </div>
      </Card>

      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Périmètre :</strong> {study.perimeter_type} · <strong>Version :</strong> {study.version} · <strong>Statut :</strong> {study.status}
        </p>
      </Card>
    </form>
  );
};

export default PCFParametrage;
