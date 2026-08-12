import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Building2, MapPin, Mail, Phone, FileText, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";

export const OrganizationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nom: "",
    numeroFiscal: "",
    secteur: "",
    adresse: "",
    ville: "",
    codePostal: "",
    pays: "",
    region: "",
    email: "",
    telephone: "",
    siteWeb: "",
    devise: "TND", // Devise par défaut pour la Tunisie
    caAnnuel: "" // Chiffre d'affaires annuel
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const secteurs = [
    { value: "technologie", label: "Technologie" },
    { value: "industrie", label: "Industrie" },
    { value: "services", label: "Services" },
    { value: "commerce", label: "Commerce" },
    { value: "construction", label: "Construction" },
    { value: "transport", label: "Transport" },
    { value: "energie", label: "Énergie" },
    { value: "agriculture", label: "Agriculture" },
    { value: "finance", label: "Finance" },
    { value: "immobilier", label: "Immobilier" },
    { value: "education", label: "Éducation" },
    { value: "sante", label: "Santé" }
  ];

  const devises = [
    { value: "TND", label: "Dinar Tunisien (TND)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "USD", label: "Dollar US (USD)" },
    { value: "MAD", label: "Dirham Marocain (MAD)" },
    { value: "DZD", label: "Dinar Algérien (DZD)" }
  ];

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      // Charger les données depuis les user_metadata et les companies
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company:', error);
      }

      // Remplir le formulaire avec les données disponibles
      const userData = user.user_metadata || {};
      setFormData({
        nom: company?.nom_entreprise || userData.company || "",
        numeroFiscal: company?.ca_annuel?.toString() || "",
        secteur: company?.secteur || "",
        adresse: "",
        ville: "",
        codePostal: "",
        pays: "",
        region: "",
        email: user.email || "",
        telephone: "",
        siteWeb: "",
        devise: company?.devise || "TND", // Récupérer la devise stockée
        caAnnuel: company?.ca_annuel_devise?.toString() || "" // Récupérer le CA en devise
      });

      // Charger le logo existant depuis Supabase Storage
      await loadLogo();

    } catch (error) {
      console.error('Error loading organization data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'organisation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.storage
        .from('company-logos')
        .list(`${user.id}/`, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading logo:', error);
        return;
      }

      if (data && data.length > 0) {
        const { data: urlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(`${user.id}/${data[0].name}`);
        
        setLogoUrl(urlData.publicUrl);
      }
    } catch (error) {
      console.error('Error in loadLogo:', error);
    }
  };

  const uploadLogo = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Supprimer l'ancien logo s'il existe
      const { data: existingFiles } = await supabase.storage
        .from('company-logos')
        .list(`${user.id}/`);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map(file => `${user.id}/${file.name}`);
        await supabase.storage
          .from('company-logos')
          .remove(filesToRemove);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // File selected
    if (file) {
      // Setting logo file
      setLogoFile(file);
      setIsSaved(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Uploader le logo si un nouveau fichier a été sélectionné
      if (logoFile) {
        await uploadLogo(logoFile);
        setLogoFile(null); // Reset du fichier après upload
        
        // Notifier les autres composants que le logo a été mis à jour
        window.dispatchEvent(new CustomEvent('logoUpdated'));
      }

      // Mettre à jour ou créer l'entreprise avec toutes les données du formulaire
      const companyData = {
        user_id: user.id,
        nom_entreprise: formData.nom,
        secteur: formData.secteur,
        devise: formData.devise, // Sauvegarder la devise choisie
        ca_annuel_devise: formData.caAnnuel ? parseFloat(formData.caAnnuel) || null : null, // CA en devise choisie
        // Convertir le numéro fiscal en CA annuel si c'est un nombre
        ca_annuel: formData.numeroFiscal ? parseFloat(formData.numeroFiscal) || null : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('companies')
        .upsert(companyData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Erreur de base de données: ${error.message}`);
      }

      setIsSaved(true);
      toast({
        title: "Sauvegarde réussie",
        description: "Les informations de votre organisation ont été mises à jour",
      });
      
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error: any) {
      console.error('Error saving organization data:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: error.message || "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informations générales */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
          <CardTitle className="flex items-center gap-3 text-xl text-green-800">
            <Building2 className="h-6 w-6" />
            Informations sur l'Organisation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Logo et nom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom" className="text-sm font-medium">
                  Nom de l'organisation *
                </Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => handleInputChange("nom", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="numeroFiscal" className="text-sm font-medium">
                  Numéro d'identification fiscale (MF)
                </Label>
                <Input
                  id="numeroFiscal"
                  value={formData.numeroFiscal}
                  onChange={(e) => handleInputChange("numeroFiscal", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="secteur" className="text-sm font-medium">
                  Secteur d'activité *
                </Label>
                <Select value={formData.secteur} onValueChange={(value) => handleInputChange("secteur", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {secteurs.map((secteur) => (
                      <SelectItem key={secteur.value} value={secteur.value}>
                        {secteur.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Devise et CA */}
              <div>
                <Label htmlFor="devise" className="text-sm font-medium">
                  Devise de fonctionnement *
                </Label>
                <Select value={formData.devise} onValueChange={(value) => handleInputChange("devise", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionnez une devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {devises.map((devise) => (
                      <SelectItem key={devise.value} value={devise.value}>
                        {devise.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="caAnnuel" className="text-sm font-medium">
                  Chiffre d'affaires annuel
                </Label>
                <Input
                  id="caAnnuel"
                  type="number"
                  value={formData.caAnnuel}
                  onChange={(e) => handleInputChange("caAnnuel", e.target.value)}
                  className="mt-1"
                  placeholder="Ex: 1000000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Montant en {formData.devise} (utilisé pour calculer l'intensité carbone)
                </p>
              </div>
            </div>

            {/* Logo upload */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Logo de l'organisation</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                {logoFile ? (
                  <div className="space-y-2">
                    <img 
                      src={URL.createObjectURL(logoFile)} 
                      alt="Logo preview" 
                      className="mx-auto h-20 w-20 object-contain rounded-lg"
                    />
                    <p className="text-sm text-gray-600">{logoFile.name}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Changer le logo
                    </Button>
                  </div>
                ) : logoUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={logoUrl} 
                      alt="Logo actuel" 
                      className="mx-auto h-20 w-20 object-contain rounded-lg"
                    />
                    <p className="text-sm text-gray-600">Logo actuel</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Changer le logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Glissez votre logo ici ou</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        Choisir un fichier
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG jusqu'à 5MB</p>
                  </div>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {/* Bouton de test visible pour déboguer */}
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adresse */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
            <MapPin className="h-6 w-6" />
            Adresse & Localisation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="adresse" className="text-sm font-medium">
                Adresse complète
              </Label>
              <Textarea
                id="adresse"
                value={formData.adresse}
                onChange={(e) => handleInputChange("adresse", e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="ville" className="text-sm font-medium">
                Ville
              </Label>
              <Input
                id="ville"
                value={formData.ville}
                onChange={(e) => handleInputChange("ville", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="codePostal" className="text-sm font-medium">
                Code postal
              </Label>
              <Input
                id="codePostal"
                value={formData.codePostal}
                onChange={(e) => handleInputChange("codePostal", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="pays" className="text-sm font-medium">
                Pays
              </Label>
              <Input
                id="pays"
                value={formData.pays}
                onChange={(e) => handleInputChange("pays", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="region" className="text-sm font-medium">
                Région
              </Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
          <CardTitle className="flex items-center gap-3 text-xl text-purple-800">
            <Mail className="h-6 w-6" />
            Contacts Principaux
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email principal
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="telephone" className="text-sm font-medium">
                Téléphone
              </Label>
              <Input
                id="telephone"
                value={formData.telephone}
                onChange={(e) => handleInputChange("telephone", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="siteWeb" className="text-sm font-medium">
                Site web (optionnel)
              </Label>
              <Input
                id="siteWeb"
                value={formData.siteWeb}
                onChange={(e) => handleInputChange("siteWeb", e.target.value)}
                className="mt-1"
                placeholder="https://www.monentreprise.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">
          Annuler
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className={`min-w-[120px] ${isSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : isSaved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Sauvegardé
            </>
          ) : (
            'Sauvegarder'
          )}
        </Button>
      </div>
    </div>
  );
};