import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2,
  Users,
  Crown,
  Zap,
  Target,
  FileText,
  Download,
  Settings,
  Calendar,
  TrendingUp,
  Globe,
  Phone,
  BookOpen,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const mockMultiSiteData = [
  { name: 'Site Paris', scope1: 1200, scope2: 800, scope3: 2100, total: 4100 },
  { name: 'Site Lyon', scope1: 800, scope2: 600, scope3: 1400, total: 2800 },
  { name: 'Site Marseille', scope1: 600, scope2: 400, scope3: 1000, total: 2000 },
];

const mockConsolidatedData = [
  { month: 'Jan', total: 8900, target: 9000 },
  { month: 'Fév', total: 8700, target: 8800 },
  { month: 'Mar', total: 8500, target: 8600 },
  { month: 'Avr', total: 8200, target: 8400 },
  { month: 'Mai', total: 8000, target: 8200 },
  { month: 'Jun', total: 7800, target: 8000 },
];

export const ProDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de site */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Crown className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold">Dashboard CarboPro</h2>
          <Badge className="bg-purple-100 text-purple-800">
            Utilisateurs illimités
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              <SelectItem value="paris">Site Paris</SelectItem>
              <SelectItem value="lyon">Site Lyon</SelectItem>
              <SelectItem value="marseille">Site Marseille</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Gérer les sites
          </Button>
        </div>
      </div>

      {/* Métriques consolidées */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total consolidé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.9</div>
            <p className="text-xs text-muted-foreground">tonnes CO₂e</p>
            <Badge variant="secondary" className="text-green-600 mt-1">
              -15%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sites actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">En suivi</p>
            <Building2 className="h-4 w-4 text-blue-600 mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Actifs</p>
            <Users className="h-4 w-4 text-green-600 mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Feuille de route climat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">Progression</p>
            <Progress value={78} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Support dédié
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">24/7</div>
            <p className="text-xs text-muted-foreground">Réponse &lt; 2h</p>
            <Badge className="bg-gold-100 text-gold-800 mt-1">VIP</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Services premium */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="font-semibold text-sm mb-1">Formation incluse</div>
            <p className="text-xs text-muted-foreground mb-3">
              2-4 sessions pour vos équipes
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Planifier
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 text-center">
            <Phone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="font-semibold text-sm mb-1">Hotline dédiée</div>
            <p className="text-xs text-muted-foreground mb-3">
              Support expert prioritaire
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Contacter
            </Button>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="font-semibold text-sm mb-1">Accompagnement</div>
            <p className="text-xs text-muted-foreground mb-3">
              RDV mensuels de suivi
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Programmer
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/30">
          <CardContent className="p-4 text-center">
            <Globe className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="font-semibold text-sm mb-1">API Access</div>
            <p className="text-xs text-muted-foreground mb-3">
              Intégration avec vos outils
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Documentation
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Onglets avancés */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="sites">Multi-sites</TabsTrigger>
          <TabsTrigger value="trajectory">Feuille de route climat</TabsTrigger>
          <TabsTrigger value="reports">Rapports avancés</TabsTrigger>
          <TabsTrigger value="users">Gestion utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution consolidée vs Objectifs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockConsolidatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stackId="1" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      name="Émissions actuelles" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance par site</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMultiSiteData.map((site, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{site.name}</span>
                        <Badge variant="outline">{site.total} t CO₂e</Badge>
                      </div>
                      <Progress value={(site.total / 4100) * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>S1: {site.scope1}</span>
                        <span>S2: {site.scope2}</span>
                        <span>S3: {site.scope3}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sites" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {mockMultiSiteData.map((site, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {site.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold">{site.total} t CO₂e</div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Scope 1</span>
                      <span>{site.scope1} t</span>
                    </div>
                    <Progress value={(site.scope1 / site.total) * 100} className="h-1" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Scope 2</span>
                      <span>{site.scope2} t</span>
                    </div>
                    <Progress value={(site.scope2 / site.total) * 100} className="h-1" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Scope 3</span>
                      <span>{site.scope3} t</span>
                    </div>
                    <Progress value={(site.scope3 / site.total) * 100} className="h-1" />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Activity className="h-3 w-3 mr-1" />
                      Détails
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Config
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ajouter un nouveau site</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Building2 className="h-4 w-4 mr-2" />
                Configurer un nouveau site
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trajectory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Feuille de route climat sur 10 ans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Objectif 2030</span>
                    <Badge className="bg-green-100 text-green-800">-50%</Badge>
                  </div>
                  <Progress value={78} />
                  <div className="text-sm text-muted-foreground">
                    Progression: 78% de l'objectif atteint
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Jalons clés</h4>
                  {[
                    { year: '2025', target: '-15%', status: 'achieved' },
                    { year: '2027', target: '-30%', status: 'on-track' },
                    { year: '2030', target: '-50%', status: 'planned' },
                    { year: '2035', target: 'Net Zero', status: 'planned' }
                  ].map((milestone, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        milestone.status === 'achieved' ? 'bg-green-600' :
                        milestone.status === 'on-track' ? 'bg-blue-600' :
                        'bg-gray-300'
                      }`} />
                      <span className="text-sm">{milestone.year}</span>
                      <Badge variant="outline" className="text-xs">
                        {milestone.target}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rapports consolidés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Rapport annuel consolidé', sites: '3 sites', date: '15 mars 2024' },
                  { name: 'Analyse comparative sites', sites: 'Tous', date: '10 mars 2024' },
                  { name: 'Trajectoire Net Zero détaillée', sites: 'Groupe', date: '5 mars 2024' }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{report.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {report.sites} • {report.date}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rapports personnalisés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Créer un rapport personnalisé
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard interactif
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="h-4 w-4 mr-2" />
                  Export API
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Gestion des utilisateurs</span>
                <Button size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Inviter un utilisateur
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Marie Dupont', role: 'Admin', site: 'Paris', status: 'active' },
                  { name: 'Jean Martin', role: 'Utilisateur', site: 'Lyon', status: 'active' },
                  { name: 'Sophie Bernard', role: 'Auditeur', site: 'Marseille', status: 'active' },
                  { name: 'Pierre Durand', role: 'Utilisateur', site: 'Paris', status: 'pending' }
                ].map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.role} • {user.site}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                      >
                        {user.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};