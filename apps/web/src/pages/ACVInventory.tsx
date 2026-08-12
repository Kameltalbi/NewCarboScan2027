import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Zap, Package, Truck, Droplets } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useACVProjects } from '@/hooks/useACVProjects';
import { InventorySettings } from '@/components/acv/inventory/InventorySettings';
import { InventoryEnergy } from '@/components/acv/inventory/InventoryEnergy';
import { InventoryMaterials } from '@/components/acv/inventory/InventoryMaterials';
import { InventoryTransport } from '@/components/acv/inventory/InventoryTransport';
import { InventoryWaterWaste } from '@/components/acv/inventory/InventoryWaterWaste';
import { ACVLayout } from '@/components/acv/ACVLayout';

export default function ACVInventory() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('parametres');
  
  const { projects } = useACVProjects();
  const project = projects.find(p => p.id === projectId);

  // If no project ID in URL, redirect to ACV dashboard
  if (!projectId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun projet sélectionné</h2>
        <p className="text-gray-600 mb-4">Veuillez sélectionner un projet pour accéder à l'inventaire des flux.</p>
        <Button onClick={() => navigate('/acv')}>
          Sélectionner un projet
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Projet non trouvé</h2>
        <Button onClick={() => navigate('/acv')}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="parametres" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="energie" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Énergie
          </TabsTrigger>
          <TabsTrigger value="matieres" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Matières
          </TabsTrigger>
          <TabsTrigger value="transports" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Transports
          </TabsTrigger>
          <TabsTrigger value="eau-dechets" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Eau & Déchets
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="parametres">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres d'inventaire</CardTitle>
                <CardDescription>
                  Configuration générale pour la collecte des données d'inventaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventorySettings 
                  projectId={projectId!} 
                  settings={null}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="energie">
            <Card>
              <CardHeader>
                <CardTitle>Énergie</CardTitle>
                <CardDescription>
                  Électricité, gaz naturel, carburants et autres sources d'énergie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryEnergy projectId={projectId!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matieres">
            <Card>
              <CardHeader>
                <CardTitle>Matières premières</CardTitle>
                <CardDescription>
                  Matériaux de construction, métaux, plastiques, bois et autres matières premières
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryMaterials projectId={projectId!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transports">
            <Card>
              <CardHeader>
                <CardTitle>Transports</CardTitle>
                <CardDescription>
                  Transport de marchandises, déplacements professionnels et logistique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryTransport projectId={projectId!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="eau-dechets">
            <Card>
              <CardHeader>
                <CardTitle>Eau & Déchets</CardTitle>
                <CardDescription>
                  Consommation d'eau et gestion des déchets (recyclage, incinération, enfouissement)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryWaterWaste projectId={projectId!} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}