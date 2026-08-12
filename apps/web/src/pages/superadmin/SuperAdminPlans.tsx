import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Copy } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  status: 'active' | 'inactive';
  features: string[];
  created_at: string;
}

export const SuperAdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    status: 'active' as 'active' | 'inactive',
    features: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Mock data for now - would fetch from actual plans table
      const mockPlans: Plan[] = [
        {
          id: '1',
          name: 'CarboStart',
          description: 'Plan de démarrage pour petites entreprises',
          price: 29,
          duration: 'monthly',
          status: 'active',
          features: ['Bilan carbone simplifié', 'Support email', '1 utilisateur'],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'CarboPro',
          description: 'Plan professionnel pour moyennes entreprises',
          price: 99,
          duration: 'monthly',
          status: 'active',
          features: ['Bilan carbone complet', 'Support prioritaire', '10 utilisateurs', 'Rapports avancés'],
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'CarboOmnibus',
          description: 'Solution complète pour grandes entreprises',
          price: 299,
          duration: 'monthly',
          status: 'active',
          features: ['Bilan carbone entreprise', 'Support dédié', 'Utilisateurs illimités', 'API', 'Formations'],
          created_at: new Date().toISOString()
        }
      ];
      
      setPlans(mockPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les plans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        price: parseFloat(formData.price),
        features: formData.features.split(',').map(f => f.trim()).filter(f => f)
      };

      if (editingPlan) {
        // Update existing plan
        toast({
          title: "Succès",
          description: "Plan mis à jour avec succès",
        });
      } else {
        // Create new plan
        const newPlan: Plan = {
          id: Date.now().toString(),
          ...planData,
          created_at: new Date().toISOString()
        };
        setPlans(prev => [...prev, newPlan]);
        
        toast({
          title: "Succès",
          description: "Plan créé avec succès",
        });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le plan",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      duration: plan.duration,
      status: plan.status,
      features: plan.features.join(', ')
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      toast({
        title: "Succès",
        description: "Plan supprimé avec succès",
      });
    }
  };

  const handleDuplicate = (plan: Plan) => {
    const duplicatedPlan: Plan = {
      ...plan,
      id: Date.now().toString(),
      name: `${plan.name} (Copie)`,
      created_at: new Date().toISOString()
    };
    setPlans(prev => [...prev, duplicatedPlan]);
    toast({
      title: "Succès",
      description: "Plan dupliqué avec succès",
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      status: 'active',
      features: ''
    });
    setEditingPlan(null);
  };

  const filteredPlans = plans.filter(plan => 
    filterStatus === 'all' || plan.status === filterStatus
  );

  if (isLoading) {
    return <div>Chargement des plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des plans d'abonnement</h2>
          <p className="text-muted-foreground">
            Créer, modifier et gérer les plans d'abonnement
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Modifier le plan' : 'Créer un nouveau plan'}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations du plan d'abonnement
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du plan</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="duration">Durée</Label>
                  <Select 
                    value={formData.duration} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="yearly">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="features">Fonctionnalités (séparées par des virgules)</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                  placeholder="Support email, 1 utilisateur, Rapports basiques"
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Mettre à jour' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plans d'abonnement</CardTitle>
          <CardDescription>
            {filteredPlans.length} plan(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{plan.description}</TableCell>
                  <TableCell>{plan.price}€</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {plan.duration === 'monthly' ? 'Mensuel' : 'Annuel'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                      {plan.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(plan)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(plan.id)}
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
    </div>
  );
};