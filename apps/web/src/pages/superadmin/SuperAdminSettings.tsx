import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Globe, CreditCard, Shield, Save } from "lucide-react";

export const SuperAdminSettings = () => {
  const { toast } = useToast();
  
  const [appSettings, setAppSettings] = useState({
    name: 'CarboScan Platform',
    description: 'Plateforme de calcul et suivi du bilan carbone',
    logo_url: '',
    support_email: 'support@carboscan.com',
    website_url: 'https://carboscan.com'
  });

  const [billingSettings, setBillingSettings] = useState({
    tax_rate: '20',
    currency: 'EUR',
    invoice_prefix: 'CT',
    payment_terms: '30'
  });

  const [securitySettings, setSecuritySettings] = useState({
    require_mfa: false,
    session_timeout: '24',
    password_min_length: '8',
    max_login_attempts: '5'
  });

  const saveAppSettings = async () => {
    try {
      // In a real app, this would save to a settings table
      toast({
        title: "Succès",
        description: "Paramètres d'application sauvegardés",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  const saveBillingSettings = async () => {
    try {
      // In a real app, this would save to a settings table
      toast({
        title: "Succès",
        description: "Paramètres de facturation sauvegardés",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  const saveSecuritySettings = async () => {
    try {
      // In a real app, this would save to a settings table
      toast({
        title: "Succès",
        description: "Paramètres de sécurité sauvegardés",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Paramètres globaux</h2>
        <p className="text-muted-foreground">
          Configuration générale de la plateforme
        </p>
      </div>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Configuration de l'application
          </CardTitle>
          <CardDescription>
            Paramètres généraux de l'application et branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app_name">Nom de l'application</Label>
              <Input
                id="app_name"
                value={appSettings.name}
                onChange={(e) => setAppSettings(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="support_email">Email de support</Label>
              <Input
                id="support_email"
                type="email"
                value={appSettings.support_email}
                onChange={(e) => setAppSettings(prev => ({ ...prev, support_email: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={appSettings.description}
              onChange={(e) => setAppSettings(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="logo_url">URL du logo</Label>
              <Input
                id="logo_url"
                value={appSettings.logo_url}
                onChange={(e) => setAppSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
            
            <div>
              <Label htmlFor="website_url">URL du site web</Label>
              <Input
                id="website_url"
                value={appSettings.website_url}
                onChange={(e) => setAppSettings(prev => ({ ...prev, website_url: e.target.value }))}
              />
            </div>
          </div>
          
          <Button onClick={saveAppSettings} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Billing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paramètres de facturation
          </CardTitle>
          <CardDescription>
            Configuration des taxes, devises et conditions de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax_rate">Taux de TVA (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                value={billingSettings.tax_rate}
                onChange={(e) => setBillingSettings(prev => ({ ...prev, tax_rate: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="currency">Devise</Label>
              <Select 
                value={billingSettings.currency} 
                onValueChange={(value) => setBillingSettings(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dollar US (USD)</SelectItem>
                  <SelectItem value="GBP">Livre Sterling (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_prefix">Préfixe des factures</Label>
              <Input
                id="invoice_prefix"
                value={billingSettings.invoice_prefix}
                onChange={(e) => setBillingSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_terms">Échéance de paiement (jours)</Label>
              <Select 
                value={billingSettings.payment_terms} 
                onValueChange={(value) => setBillingSettings(prev => ({ ...prev, payment_terms: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Immédiat</SelectItem>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={saveBillingSettings} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Paramètres de sécurité
          </CardTitle>
          <CardDescription>
            Configuration de la sécurité et des accès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exiger l'authentification multi-facteurs</Label>
              <p className="text-sm text-muted-foreground">
                Forcer l'activation de la 2FA pour tous les utilisateurs
              </p>
            </div>
            <Switch
              checked={securitySettings.require_mfa}
              onCheckedChange={(checked) => 
                setSecuritySettings(prev => ({ ...prev, require_mfa: checked }))
              }
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session_timeout">Durée de session (heures)</Label>
              <Select 
                value={securitySettings.session_timeout} 
                onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, session_timeout: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 heure</SelectItem>
                  <SelectItem value="8">8 heures</SelectItem>
                  <SelectItem value="24">24 heures</SelectItem>
                  <SelectItem value="168">7 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="password_min_length">Longueur minimale du mot de passe</Label>
              <Select 
                value={securitySettings.password_min_length} 
                onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, password_min_length: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 caractères</SelectItem>
                  <SelectItem value="8">8 caractères</SelectItem>
                  <SelectItem value="12">12 caractères</SelectItem>
                  <SelectItem value="16">16 caractères</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="max_login_attempts">Tentatives de connexion maximum</Label>
            <Select 
              value={securitySettings.max_login_attempts} 
              onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, max_login_attempts: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 tentatives</SelectItem>
                <SelectItem value="5">5 tentatives</SelectItem>
                <SelectItem value="10">10 tentatives</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={saveSecuritySettings} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};