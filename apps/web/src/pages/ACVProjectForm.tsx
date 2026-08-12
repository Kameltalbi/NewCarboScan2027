import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Target, Circle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function ACVProjectForm() {
  const navigate = useNavigate();
  const { createProject } = useACVProjects();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // Vérifier l'authentification
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentification requise",
        description: "Vous devez vous connecter pour créer un projet ACV",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  // Afficher un loader pendant la vérification de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    functional_unit: '',
    goal_definition: '',
    scope_definition: '',
    system_boundaries: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.functional_unit || !formData.goal_definition || !formData.scope_definition) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const project = await createProject({
        ...formData,
        status: 'draft',
      });
      
      navigate(`/acv/projet/${project.id}/inventaire`);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const goalOptions = [
    'Communication interne',
    'Éco-conception',
    'Comparaison de produits',
    'Certification environnementale',
    'Conformité réglementaire',
    'Amélioration continue',
  ];

  const scopeOptions = [
    'Berceau à la tombe (cradle-to-grave)',
    'Berceau à la porte (cradle-to-gate)',
    'Porte à porte (gate-to-gate)',
    'Berceau au berceau (cradle-to-cradle)',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/acv')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nouveau projet ACV
          </h1>
          <p className="text-gray-600">
            Définissez l'objectif et le champ de votre analyse de cycle de vie (Étape 1 - ISO 14040)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informations générales
              </CardTitle>
              <CardDescription>
                Identifiez votre projet et sa description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du projet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex. ACV Ciment Portland CEM I"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description détaillée du projet..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Goal Definition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Définition de l'objectif
              </CardTitle>
              <CardDescription>
                Pourquoi réalisez-vous cette ACV ? À qui s'adresse-t-elle ?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="goal">Objectif de l'étude *</Label>
                <Select
                  value={formData.goal_definition}
                  onValueChange={(value) => setFormData({ ...formData, goal_definition: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez l'objectif principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalOptions.map((goal) => (
                      <SelectItem key={goal} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Scope Definition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Circle className="w-5 h-5 mr-2" />
                Définition du champ d'étude
              </CardTitle>
              <CardDescription>
                Unité fonctionnelle et périmètre de l'analyse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="functional_unit">Unité fonctionnelle *</Label>
                <Input
                  id="functional_unit"
                  value={formData.functional_unit}
                  onChange={(e) => setFormData({ ...formData, functional_unit: e.target.value })}
                  placeholder="ex. 1 tonne de ciment, 1 m² de façade, 1 kg de produit"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'unité de référence pour quantifier la fonction du système étudié
                </p>
              </div>
              
              <div>
                <Label htmlFor="scope">Périmètre de l'étude *</Label>
                <Select
                  value={formData.scope_definition}
                  onValueChange={(value) => setFormData({ ...formData, scope_definition: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le périmètre" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {scope}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="boundaries">Frontières du système</Label>
                <Textarea
                  id="boundaries"
                  value={formData.system_boundaries}
                  onChange={(e) => setFormData({ ...formData, system_boundaries: e.target.value })}
                  placeholder="Décrivez ce qui est inclus et exclu de l'analyse..."
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Précisez les étapes du cycle de vie incluses dans l'étude
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/acv')}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Création...' : 'Créer le projet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}