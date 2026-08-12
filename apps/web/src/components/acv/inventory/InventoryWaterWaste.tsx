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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useACVInventory, InventoryItem } from '@/hooks/useACVInventory';

const waterWasteSchema = z.object({
  flow_type: z.enum(['input', 'output']),
  item: z.string().min(1, 'Le type est requis'),
  quantity: z.number().positive('La quantité doit être positive'),
  unit: z.string().min(1, 'L\'unité est requise'),
  data_source: z.string().min(1, 'La source est requise'),
  data_quality: z.number().min(1).max(5),
  notes: z.string().optional(),
});

interface InventoryWaterWasteProps {
  projectId: string;
}

export function InventoryWaterWaste({ projectId }: InventoryWaterWasteProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('eau');
  
  const { getInventoryByCategory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useACVInventory(projectId);
  
  const waterItems = getInventoryByCategory('Eau').filter(item => item.flow_type === 'input');
  const wasteItems = getInventoryByCategory('Dechets').filter(item => item.flow_type === 'output');

  const form = useForm<z.infer<typeof waterWasteSchema>>({
    resolver: zodResolver(waterWasteSchema),
    defaultValues: {
      flow_type: 'input',
      item: '',
      quantity: 0,
      unit: '',
      data_source: '',
      data_quality: 3,
      notes: '',
    },
  });

  const waterTypes = [
    { value: 'Tap_Water', label: 'Eau potable (SONEDE)', unit: 'm³' },
    { value: 'Industrial_Water', label: 'Eau industrielle', unit: 'm³' },
    { value: 'Well_Water', label: 'Eau de forage', unit: 'm³' },
    { value: 'Rainwater', label: 'Eau de pluie', unit: 'm³' },
  ];

  const wasteTypes = [
    { value: 'Landfill', label: 'Enfouissement', unit: 't' },
    { value: 'Incineration', label: 'Incinération', unit: 't' },
    { value: 'Recycling_Paper', label: 'Recyclage papier/carton', unit: 't' },
    { value: 'Recycling_Plastic', label: 'Recyclage plastique', unit: 't' },
    { value: 'Recycling_Metal', label: 'Recyclage métaux', unit: 't' },
    { value: 'Recycling_Glass', label: 'Recyclage verre', unit: 't' },
    { value: 'Composting', label: 'Compostage', unit: 't' },
    { value: 'Hazardous_Waste', label: 'Déchets dangereux', unit: 't' },
  ];

  const dataQualityLabels = {
    1: 'Mesuré',
    2: 'Calculé',
    3: 'Estimé',
    4: 'Approximatif', 
    5: 'Hypothèse'
  };

  const onSubmit = async (values: z.infer<typeof waterWasteSchema>) => {
    const itemData = {
      project_id: projectId,
      phase: 'production',
      category: values.flow_type === 'input' ? 'Eau' : 'Dechets',
      flow_type: values.flow_type,
      item: values.item,
      quantity: values.quantity,
      unit: values.unit,
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
      flow_type: item.flow_type as 'input' | 'output',
      item: item.item,
      quantity: item.quantity,
      unit: item.unit,
      data_source: item.data_source || '',
      data_quality: item.data_quality,
      notes: item.notes || '',
    });
    setActiveTab(item.category === 'Eau' ? 'eau' : 'dechets');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      await deleteInventoryItem(id);
    }
  };

  const getCurrentTypes = () => {
    const flowType = form.watch('flow_type');
    return flowType === 'input' ? waterTypes : wasteTypes;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Eau et déchets</h3>
          <p className="text-sm text-gray-600">
            Consommations d'eau et gestion des déchets
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
                {editingItem ? 'Modifier' : 'Ajouter'} eau/déchet
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="flow_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de flux</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="input">Entrée (Eau)</SelectItem>
                          <SelectItem value="output">Sortie (Déchets)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="item"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch('flow_type') === 'input' ? 'Type d\'eau' : 'Filière de déchets'}
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const types = getCurrentTypes();
                            const type = types.find(t => t.value === value);
                            if (type) {
                              form.setValue('unit', type.unit);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getCurrentTypes().map((type) => (
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
                            <SelectItem value="Factures SONEDE">Factures SONEDE</SelectItem>
                            <SelectItem value="Relevé compteur">Relevé compteur</SelectItem>
                            <SelectItem value="BSD déchets">Bordereau de suivi déchets</SelectItem>
                            <SelectItem value="Facture prestataire">Facture prestataire</SelectItem>
                            <SelectItem value="Pesée">Pesée sur site</SelectItem>
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
                        <Textarea {...field} placeholder="Usage, traitement, composition déchets..." />
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
      <div className="bg-cyan-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-cyan-900">Conseils pour la collecte :</p>
            <ul className="text-cyan-800 mt-1 space-y-1">
              <li>• <strong>Eau</strong> : factures SONEDE, relevés compteurs</li>
              <li>• <strong>Déchets</strong> : bordereaux de suivi, factures prestataires</li>
              <li>• Séparer par filière : recyclage, enfouissement, incinération</li>
              <li>• Noter la composition des déchets si connue</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs for Water and Waste */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="eau">Eau ({waterItems.length})</TabsTrigger>
          <TabsTrigger value="dechets">Déchets ({wasteItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="eau" className="space-y-4">
          {waterItems.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type d'eau</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Qualité</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waterItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {waterTypes.find(t => t.value === item.item)?.label || item.item}
                      </TableCell>
                      <TableCell>{item.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.unit}</Badge>
                      </TableCell>
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
              <p>Aucune consommation d'eau enregistrée</p>
              <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dechets" className="space-y-4">
          {wasteItems.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filière de traitement</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Qualité</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {wasteTypes.find(t => t.value === item.item)?.label || item.item}
                      </TableCell>
                      <TableCell>{item.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.unit}</Badge>
                      </TableCell>
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
              <p>Aucun déchet enregistré</p>
              <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}