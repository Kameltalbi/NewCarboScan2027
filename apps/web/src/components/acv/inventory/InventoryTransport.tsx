import React, { useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useACVInventory, InventoryItem } from '@/hooks/useACVInventory';

const transportSchema = z.object({
  item: z.string().min(1, 'Le mode de transport est requis'),
  quantity: z.number().positive('La quantité doit être positive'),
  unit: z.string().min(1, 'L\'unité est requise'),
  data_source: z.string().min(1, 'La source est requise'),
  data_quality: z.number().min(1).max(5),
  notes: z.string().optional(),
});

interface InventoryTransportProps {
  projectId: string;
}

export function InventoryTransport({ projectId }: InventoryTransportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    distance: 0,
    mass: 0,
    loadFactor: 1,
  });
  
  const { getInventoryByCategory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useACVInventory(projectId);
  
  const transportItems = getInventoryByCategory('Transports');

  const form = useForm<z.infer<typeof transportSchema>>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      item: '',
      quantity: 0,
      unit: '',
      data_source: '',
      data_quality: 3,
      notes: '',
    },
  });

  const transportModes = [
    // Véhicules (km)
    { value: 'Car_km', label: 'Voiture légère', unit: 'km', category: 'vehicle' },
    { value: 'Motorcycle_km', label: 'Moto', unit: 'km', category: 'vehicle' },
    { value: 'Van_km', label: 'Camionnette', unit: 'km', category: 'vehicle' },
    
    // Transport de marchandises (t.km)
    { value: 'Truck_tkm', label: 'Camion (12t)', unit: 't.km', category: 'freight' },
    { value: 'HeavyTruck_tkm', label: 'Poids lourd (40t)', unit: 't.km', category: 'freight' },
    { value: 'Ship_tkm', label: 'Transport maritime', unit: 't.km', category: 'freight' },
    { value: 'Train_tkm', label: 'Train marchandises', unit: 't.km', category: 'freight' },
    
    // Transport de personnes (p.km)
    { value: 'Bus_pkm', label: 'Autobus', unit: 'p.km', category: 'passenger' },
    { value: 'Train_pkm', label: 'Train voyageurs', unit: 'p.km', category: 'passenger' },
    { value: 'Plane_shorthaul', label: 'Avion court-courrier', unit: 'p.km', category: 'passenger' },
    { value: 'Plane_longhaul', label: 'Avion long-courrier', unit: 'p.km', category: 'passenger' },
  ];

  const dataQualityLabels = {
    1: 'Mesuré',
    2: 'Calculé',
    3: 'Estimé', 
    4: 'Approximatif',
    5: 'Hypothèse'
  };

  const calculateTonKm = () => {
    const result = calculatorData.distance * calculatorData.mass * calculatorData.loadFactor;
    return result;
  };

  const onSubmit = async (values: z.infer<typeof transportSchema>) => {
    const itemData = {
      project_id: projectId,
      phase: 'transport',
      flow_type: 'input' as const,
      category: 'Transports',
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
      item: item.item,
      quantity: item.quantity,
      unit: item.unit,
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
          <h3 className="text-lg font-semibold">Transports et logistique</h3>
          <p className="text-sm text-gray-600">
            Déplacements, transport de marchandises et logistique
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); form.reset(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Modifier' : 'Ajouter'} un transport
              </DialogTitle>
            </DialogHeader>

            {/* Calculator */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Calculateur t.km
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Distance (km)</label>
                    <Input 
                      type="number" 
                      value={calculatorData.distance}
                      onChange={(e) => setCalculatorData(prev => ({ ...prev, distance: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Masse (t)</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={calculatorData.mass}
                      onChange={(e) => setCalculatorData(prev => ({ ...prev, mass: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Taux de remplissage</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      max="1"
                      value={calculatorData.loadFactor}
                      onChange={(e) => setCalculatorData(prev => ({ ...prev, loadFactor: parseFloat(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">Résultat: </span>
                  <span className="font-semibold text-lg">{calculateTonKm().toFixed(1)} t.km</span>
                  <Button 
                    size="sm" 
                    className="ml-2"
                    onClick={() => form.setValue('quantity', calculateTonKm())}
                  >
                    Utiliser
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="item"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mode de transport</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const transport = transportModes.find(t => t.value === value);
                            if (transport) {
                              form.setValue('unit', transport.unit);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="p-2 text-xs font-semibold text-gray-500 border-b">VÉHICULES</div>
                            {transportModes.filter(t => t.category === 'vehicle').map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label} ({mode.unit})
                              </SelectItem>
                            ))}
                            <div className="p-2 text-xs font-semibold text-gray-500 border-b">MARCHANDISES</div>
                            {transportModes.filter(t => t.category === 'freight').map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label} ({mode.unit})
                              </SelectItem>
                            ))}
                            <div className="p-2 text-xs font-semibold text-gray-500 border-b">PASSAGERS</div>
                            {transportModes.filter(t => t.category === 'passenger').map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label} ({mode.unit})
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
                            <SelectItem value="CMR transporteur">CMR transporteur</SelectItem>
                            <SelectItem value="Bon de livraison">Bon de livraison</SelectItem>
                            <SelectItem value="Facture transport">Facture transport</SelectItem>
                            <SelectItem value="Billets transport">Billets de transport</SelectItem>
                            <SelectItem value="Carnet de route">Carnet de route</SelectItem>
                            <SelectItem value="GPS/Télématique">Données GPS/Télématique</SelectItem>
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
                        <Textarea {...field} placeholder="Trajet, charge utile, hypothèses..." />
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
      <div className="bg-orange-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-900">Conseils pour la collecte :</p>
            <ul className="text-orange-800 mt-1 space-y-1">
              <li>• <strong>km véhicule</strong> : flotte interne, déplacements pro</li>
              <li>• <strong>t.km</strong> : transport amont/aval = distance × masse × taux remplissage</li>
              <li>• <strong>p.km</strong> : déplacements voyageurs (avion, train)</li>
              <li>• Sources : CMR, bons de livraison, factures transport, billets</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Table */}
      {transportItems.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mode de transport</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Qualité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transportItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {transportModes.find(t => t.value === item.item)?.label || item.item}
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
          <p>Aucun transport enregistré</p>
          <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
        </div>
      )}
    </div>
  );
}