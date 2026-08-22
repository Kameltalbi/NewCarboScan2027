import React, { useState, useEffect } from 'react';
import { api } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Percent,
  DollarSign,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  minimum_amount: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applicable_plans: string[];
  created_at: string;
  updated_at: string;
}

export default function SuperAdminPromoCodes() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    minimum_amount: 0,
    max_uses: null as number | null,
    valid_from: '',
    valid_until: '',
    is_active: true,
    applicable_plans: ['carbo_start', 'carbo_plus', 'carbo_pro']
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const { items } = await api.adminListPromoCodes();
      setPromoCodes((items as unknown as PromoCode[]) || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes promo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        code: formData.code,
        description: formData.description,
        discountType: formData.discount_type,
        discountValue: formData.discount_value,
        minimumAmount: formData.minimum_amount,
        maxUses: formData.max_uses === 0 ? null : formData.max_uses,
        validUntil: formData.valid_until || null,
        validFrom: formData.valid_from || new Date().toISOString().split('T')[0],
        isActive: formData.is_active,
        applicablePlans: formData.applicable_plans,
      };

      if (selectedCode) {
        await api.adminPatchPromoCode(selectedCode.id, dataToSubmit);
        
        toast({
          title: "Succès",
          description: "Code promo modifié avec succès",
        });
        setShowEditModal(false);
      } else {
        // Create new code
        await api.adminCreatePromoCode(dataToSubmit);
        
        toast({
          title: "Succès",
          description: "Code promo créé avec succès",
        });
        setShowAddModal(false);
      }

      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast({
        title: "Erreur",
        description: error.message.includes('duplicate') 
          ? "Ce code promo existe déjà" 
          : "Impossible de sauvegarder le code promo",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      minimum_amount: 0,
      max_uses: null,
      valid_from: '',
      valid_until: '',
      is_active: true,
      applicable_plans: ['carbo_start', 'carbo_plus', 'carbo_pro']
    });
    setSelectedCode(null);
  };

  const handleEdit = (code: PromoCode) => {
    setSelectedCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      minimum_amount: code.minimum_amount,
      max_uses: code.max_uses,
      valid_from: code.valid_from.split('T')[0],
      valid_until: code.valid_until ? code.valid_until.split('T')[0] : '',
      is_active: code.is_active,
      applicable_plans: code.applicable_plans
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;

    try {
      await api.adminDeletePromoCode(id);

      toast({
        title: "Succès",
        description: "Code promo supprimé avec succès",
      });

      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code promo",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.adminPatchPromoCode(id, { isActive: !currentStatus });

      toast({
        title: "Succès",
        description: `Code promo ${!currentStatus ? 'activé' : 'désactivé'} avec succès`,
      });

      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du code promo",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copié",
      description: `Code "${code}" copié dans le presse-papier`,
    });
  };

  const getStatusBadge = (code: PromoCode) => {
    const now = new Date();
    const validFrom = new Date(code.valid_from);
    const validUntil = code.valid_until ? new Date(code.valid_until) : null;
    const isExpired = validUntil && validUntil < now;
    const isNotStarted = validFrom > now;
    const isMaxUsesReached = code.max_uses && code.current_uses >= code.max_uses;

    if (!code.is_active) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Inactif</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    if (isNotStarted) {
      return <Badge variant="outline" className="border-blue-500 text-blue-600">À venir</Badge>;
    }
    if (isMaxUsesReached) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Épuisé</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
  };

  const filteredCodes = promoCodes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (code.description && code.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCodesCount = promoCodes.filter(code => code.is_active).length;
  const totalUsage = promoCodes.reduce((sum, code) => sum + code.current_uses, 0);
  const averageDiscount = promoCodes.length > 0 
    ? promoCodes.reduce((sum, code) => sum + code.discount_value, 0) / promoCodes.length 
    : 0;

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{promoCodes.length}</p>
            <p className="text-sm text-gray-600">Total codes</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{activeCodesCount}</p>
            <p className="text-sm text-gray-600">Codes actifs</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalUsage}</p>
            <p className="text-sm text-gray-600">Utilisations</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {averageDiscount.toFixed(0)}{promoCodes.some(c => c.discount_type === 'percentage') ? '%' : ' TND'}
            </p>
            <p className="text-sm text-gray-600">Réduction moy.</p>
          </div>
        </Card>
      </div>

      {/* Barre de recherche et bouton d'ajout */}
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Rechercher un code promo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Code Promo
        </Button>
      </div>

      {/* Tableau des codes promo */}
      <Card>
        <CardHeader>
          <CardTitle>Codes Promo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type & Valeur</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Plans</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{code.code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {code.description || 'Aucune description'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {code.discount_type === 'percentage' ? (
                        <Percent className="h-4 w-4 text-green-600" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="font-medium">
                        {code.discount_value}{code.discount_type === 'percentage' ? '%' : ' TND'}
                      </span>
                    </div>
                    {code.minimum_amount > 0 && (
                      <div className="text-xs text-gray-500">
                        Min: {code.minimum_amount} TND
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''}
                      {code.max_uses && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{ width: `${Math.min((code.current_uses / code.max_uses) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>Du: {new Date(code.valid_from).toLocaleDateString('fr-FR')}</div>
                      {code.valid_until && (
                        <div>Au: {new Date(code.valid_until).toLocaleDateString('fr-FR')}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {code.applicable_plans.map(plan => (
                        <Badge key={plan} variant="outline" className="text-xs">
                          {plan.replace('carbo_', '')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(code)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(code)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(code.id, code.is_active)}
                      >
                        {code.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(code.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Ajouter Code Promo */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un Nouveau Code Promo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code Promo</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="PROMO2024"
                    required
                    className="font-mono"
                  />
                  <Button type="button" onClick={generateRandomCode} variant="outline">
                    Générer
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="discount_type">Type de Réduction</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(value: 'percentage' | 'fixed_amount') => 
                    setFormData(prev => ({ ...prev, discount_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Montant fixe (TND)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du code promo..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_value">
                  Valeur de la Réduction {formData.discount_type === 'percentage' ? '(%)' : '(TND)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="minimum_amount">Montant Minimum (TND)</Label>
                <Input
                  id="minimum_amount"
                  type="number"
                  value={formData.minimum_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_amount: Number(e.target.value) }))}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_uses">Nombre d'Utilisations Max (optionnel)</Label>
                <Input
                  id="max_uses"
                  type="number"
                  value={formData.max_uses || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    max_uses: e.target.value ? Number(e.target.value) : null 
                  }))}
                  min="1"
                  placeholder="Illimité"
                />
              </div>
              
              <div>
                <Label htmlFor="valid_from">Date de Début</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_until">Date de Fin (optionnel)</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Code actif</Label>
              </div>
            </div>

            <div>
              <Label>Plans Applicables</Label>
              <div className="flex gap-4 mt-2">
                {['carbo_start', 'carbo_plus', 'carbo_pro'].map(plan => (
                  <label key={plan} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.applicable_plans.includes(plan)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            applicable_plans: [...prev.applicable_plans, plan]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            applicable_plans: prev.applicable_plans.filter(p => p !== plan)
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="capitalize">{plan.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Créer le Code
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Modifier Code Promo */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le Code Promo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Même formulaire que pour l'ajout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Code Promo</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-discount_type">Type de Réduction</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(value: 'percentage' | 'fixed_amount') => 
                    setFormData(prev => ({ ...prev, discount_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Montant fixe (TND)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du code promo..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-discount_value">
                  Valeur de la Réduction {formData.discount_type === 'percentage' ? '(%)' : '(TND)'}
                </Label>
                <Input
                  id="edit-discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-minimum_amount">Montant Minimum (TND)</Label>
                <Input
                  id="edit-minimum_amount"
                  type="number"
                  value={formData.minimum_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_amount: Number(e.target.value) }))}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-max_uses">Nombre d'Utilisations Max (optionnel)</Label>
                <Input
                  id="edit-max_uses"
                  type="number"
                  value={formData.max_uses || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    max_uses: e.target.value ? Number(e.target.value) : null 
                  }))}
                  min="1"
                  placeholder="Illimité"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-valid_from">Date de Début</Label>
                <Input
                  id="edit-valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-valid_until">Date de Fin (optionnel)</Label>
                <Input
                  id="edit-valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Code actif</Label>
              </div>
            </div>

            <div>
              <Label>Plans Applicables</Label>
              <div className="flex gap-4 mt-2">
                {['carbo_start', 'carbo_plus', 'carbo_pro'].map(plan => (
                  <label key={plan} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.applicable_plans.includes(plan)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            applicable_plans: [...prev.applicable_plans, plan]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            applicable_plans: prev.applicable_plans.filter(p => p !== plan)
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="capitalize">{plan.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Sauvegarder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}