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

const materialsSchema = z.object({
  item: z.string().min(1, 'Le matériau est requis'),
  quantity: z.number().positive('La quantité doit être positive'),
  unit: z.string().min(1, 'L\'unité est requise'),
  recycled_percentage: z.number().min(0).max(100).optional(),
  supplier_country: z.string().optional(),
  data_source: z.string().min(1, 'La source est requise'),
  data_quality: z.number().min(1).max(5),
  notes: z.string().optional(),
});

interface InventoryMaterialsProps {
  projectId: string;
}

export function InventoryMaterials({ projectId }: InventoryMaterialsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const { getInventoryByCategory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useACVInventory(projectId);
  
  const materialsItems = getInventoryByCategory('Matieres');

  const form = useForm<z.infer<typeof materialsSchema>>({
    resolver: zodResolver(materialsSchema),
    defaultValues: {
      item: '',
      quantity: 0,
      unit: '',
      recycled_percentage: 0,
      supplier_country: '',
      data_source: '',
      data_quality: 3,
      notes: '',
    },
  });

  const materialTypes = [
    { value: 'Cement', label: 'Ciment', unit: 't' },
    { value: 'Steel', label: 'Acier', unit: 't' },
    { value: 'Aluminum', label: 'Aluminium', unit: 't' },
    { value: 'Concrete', label: 'Béton', unit: 'm³' },
    { value: 'Glass', label: 'Verre', unit: 't' },
    { value: 'Wood', label: 'Bois', unit: 'm³' },
    { value: 'Plastic_PE', label: 'Plastique PE', unit: 'kg' },
    { value: 'Plastic_PP', label: 'Plastique PP', unit: 'kg' },
    { value: 'Cardboard', label: 'Carton', unit: 'kg' },
    { value: 'Paper', label: 'Papier', unit: 'kg' },
  ];

  const dataQualityLabels = {
    1: 'Mesuré',
    2: 'Calculé', 
    3: 'Estimé',
    4: 'Approximatif',
    5: 'Hypothèse'
  };

  const onSubmit = async (values: z.infer<typeof materialsSchema>) => {
    const itemData = {
      project_id: projectId,
      phase: 'production',
      flow_type: 'input' as const,
      category: 'Matieres',
      item: values.item,
      quantity: values.quantity,
      unit: values.unit,
      data_source: values.data_source,
      data_quality: values.data_quality,
      recycled_percentage: values.recycled_percentage,
      supplier_country: values.supplier_country,
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
      recycled_percentage: item.recycled_percentage || 0,
      supplier_country: item.supplier_country || '',
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
          <h3 className="text-lg font-semibold">Matières et composants</h3>
          <p className="text-sm text-gray-600">
            Matériaux, composants et emballages utilisés dans le produit
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
                {editingItem ? 'Modifier' : 'Ajouter'} un matériau
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
                        <FormLabel>Matériau</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const material = materialTypes.find(t => t.value === value);
                            if (material) {
                              form.setValue('unit', material.unit);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le matériau" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materialTypes.map((type) => (
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

                <div className="grid grid-cols-3 gap-4">
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
                    name="recycled_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Recyclé</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays fournisseur</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ex: France" />
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
                            <SelectItem value="BL fournisseur">BL fournisseur</SelectItem>
                            <SelectItem value="Facture fournisseur">Facture fournisseur</SelectItem>
                            <SelectItem value="ERP">Système ERP</SelectItem>
                            <SelectItem value="Inventaire">Inventaire physique</SelectItem>
                            <SelectItem value="Devis">Devis fournisseur</SelectItem>
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
                        <Textarea {...field} placeholder="Spécifications, qualité, origine..." />
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
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-900">Conseils pour la collecte :</p>
            <ul className="text-green-800 mt-1 space-y-1">
              <li>• Matières premières : BL fournisseurs, commandes, inventaires</li>
              <li>• Emballages : créer des lignes séparées (carton, film, palettes)</li>
              <li>• % recyclé : information fournisseur ou certification</li>
              <li>• Origine : important pour les facteurs d'impact régionaux</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Table */}
      {materialsItems.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matériau</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>% Recyclé</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Qualité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialsItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{materialTypes.find(t => t.value === item.item)?.label || item.item}</div>
                      <div className="text-sm text-gray-500">{item.quantity.toLocaleString()} {item.unit}</div>
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    {item.recycled_percentage ? (
                      <Badge variant="outline" className="bg-green-50">
                        {item.recycled_percentage}%
                      </Badge>
                    ) : (
                      <span className="text-gray-400">0%</span>
                    )}
                  </TableCell>
                  <TableCell>{item.supplier_country || '-'}</TableCell>
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
          <p>Aucun matériau enregistré</p>
          <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
        </div>
      )}
    </div>
  );
}