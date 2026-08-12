import React, { useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useACVInventory, InventoryItem } from '@/hooks/useACVInventory';

const energySchema = z.object({
  item: z.string().min(1, 'Le type d\'énergie est requis'),
  quantity: z.number().positive('La quantité doit être positive'),
  unit: z.string().min(1, 'L\'unité est requise'),
  location: z.string().optional(),
  data_source: z.string().min(1, 'La source est requise'),
  data_quality: z.number().min(1).max(5),
  notes: z.string().optional(),
});

interface InventoryEnergyProps {
  projectId: string;
}

export function InventoryEnergy({ projectId }: InventoryEnergyProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, getInventoryByCategory } = useACVInventory(projectId);
  
  const energyItems = getInventoryByCategory('Energie');

  const form = useForm<z.infer<typeof energySchema>>({
    resolver: zodResolver(energySchema),
    defaultValues: {
      item: '',
      quantity: 0,
      unit: '',
      location: '',
      data_source: '',
      data_quality: 3,
      notes: '',
    },
  });

  const energyTypes = [
    { value: 'Electricity_Tunisia', label: 'Électricité Tunisie', unit: 'kWh' },
    { value: 'Natural_Gas', label: 'Gaz naturel', unit: 'm³' },
    { value: 'Diesel', label: 'Diesel', unit: 'L' },
    { value: 'Gasoline', label: 'Essence', unit: 'L' },
    { value: 'LPG', label: 'GPL', unit: 'kg' },
    { value: 'Heavy_Fuel_Oil', label: 'Fuel lourd', unit: 'L' },
  ];

  const dataQualityLabels = {
    1: 'Mesuré',
    2: 'Calculé',
    3: 'Estimé',
    4: 'Approximatif',
    5: 'Hypothèse'
  };

  const onSubmit = async (values: z.infer<typeof energySchema>) => {
    const itemData = {
      project_id: projectId,
      phase: 'production',
      flow_type: 'input' as const,
      category: 'Energie',
      item: values.item,
      quantity: values.quantity,
      unit: values.unit,
      location: values.location,
      data_source: values.data_source,
      data_quality: values.data_quality,
      notes: values.notes,
    };

    if (editingItem) {
      await updateInventoryItem(editingItem.id, itemData);
      setEditingItem(null);
    } else {
      await addInventoryItem(itemData);
    }

    form.reset();
    setIsDialogOpen(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    form.reset({
      item: item.item,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location || '',
      data_source: item.data_source || '',
      data_quality: item.data_quality,
      notes: item.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      await deleteInventoryItem(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Consommations énergétiques</h3>
          <p className="text-sm text-gray-600">
            Saisissez toutes les consommations d'énergie (électricité, carburants, etc.)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); form.reset(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Modifier' : 'Ajouter'} une consommation énergétique
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="item"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type d'énergie</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const energyType = energyTypes.find(t => t.value === value);
                            if (energyType) {
                              form.setValue('unit', energyType.unit);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {energyTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantité</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unité</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site/Localisation</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ex: Usine Sfax" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source des données</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Factures STEG">Factures STEG</SelectItem>
                            <SelectItem value="Compteur">Relevé compteur</SelectItem>
                            <SelectItem value="Factures carburant">Factures carburant</SelectItem>
                            <SelectItem value="Carte carburant">Carte carburant</SelectItem>
                            <SelectItem value="ERP">Système ERP</SelectItem>
                            <SelectItem value="Estimation">Estimation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qualité des données</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(dataQualityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {value} - {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Commentaires, hypothèses..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingItem ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Conseils pour la collecte :</p>
            <ul className="text-blue-800 mt-1 space-y-1">
              <li>• Électricité : utilisez les factures STEG ou relevés de compteurs</li>
              <li>• Carburants : bons de carburant, cartes professionnelles</li>
              <li>• Gaz : factures distributeur ou relevés de compteurs</li>
              <li>• Période : alignez sur l'année de référence du projet</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Table */}
      {energyItems.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type d'énergie</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Qualité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {energyItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {energyTypes.find(t => t.value === item.item)?.label || item.item}
                  </TableCell>
                  <TableCell>{item.quantity.toLocaleString()}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.location || '-'}</TableCell>
                  <TableCell className="text-sm">{item.data_source}</TableCell>
                  <TableCell>
                    <Badge variant={item.data_quality <= 2 ? "default" : item.data_quality <= 3 ? "secondary" : "destructive"}>
                      {dataQualityLabels[item.data_quality as keyof typeof dataQualityLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune consommation énergétique enregistrée</p>
          <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
        </div>
      )}
    </div>
  );
}