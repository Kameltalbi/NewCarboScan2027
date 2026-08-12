import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Globe, 
  Shield, 
  Trash2, 
  AlertTriangle, 
  Download, 
  Clock,
  Scale,
  Languages,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";

export const AdvancedSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    units: "tonnes",
    dateFormat: "dd/mm/yyyy",
    language: "fr",
    timezone: "Africa/Tunis",
    publicReports: false,
    dataRetention: "5years",
    emailNotifications: true,
    weeklyReports: true,
    monthlyDigest: false
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExportData = () => {
    // TODO: implement data export
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation === "SUPPRIMER") {
      // TODO: implement account deletion
      setShowDeleteDialog(false);
      setDeleteConfirmation("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Units and Display */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
            <Scale className="h-6 w-6" />
            Unités & Affichage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="units" className="text-sm font-medium">
                Unités d'émission CO₂
              </Label>
              <Select value={settings.units} onValueChange={(value) => handleSettingChange("units", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tonnes">Tonnes CO₂eq (tCO₂eq)</SelectItem>
                  <SelectItem value="kg">Kilogrammes CO₂eq (kgCO₂eq)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat" className="text-sm font-medium">
                Format de date
              </Label>
              <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange("dateFormat", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/mm/yyyy">JJ/MM/AAAA (20/07/2025)</SelectItem>
                  <SelectItem value="mm/dd/yyyy">MM/JJ/AAAA (07/20/2025)</SelectItem>
                  <SelectItem value="yyyy-mm-dd">AAAA-MM-JJ (2025-07-20)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-medium">
                Langue
              </Label>
              <Select value={settings.language} onValueChange={(value) => handleSettingChange("language", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium">
                Fuseau horaire
              </Label>
              <Select value={settings.timezone} onValueChange={(value) => handleSettingChange("timezone", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Tunis">Afrique/Tunis (GMT+1)</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                  <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
          <CardTitle className="flex items-center gap-3 text-xl text-green-800">
            <Shield className="h-6 w-6" />
            Confidentialité & Données
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {settings.publicReports ? (
                    <Eye className="h-4 w-4 text-blue-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-600" />
                  )}
                  <Label className="font-medium">Rapports publics</Label>
                </div>
                <p className="text-sm text-gray-600">
                  Permettre l'inclusion de vos données dans des rapports publics anonymisés
                </p>
              </div>
              <Switch
                checked={settings.publicReports}
                onCheckedChange={(checked) => handleSettingChange("publicReports", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Rétention des données
              </Label>
              <Select value={settings.dataRetention} onValueChange={(value) => handleSettingChange("dataRetention", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1year">1 an après suppression du compte</SelectItem>
                  <SelectItem value="3years">3 ans après suppression du compte</SelectItem>
                  <SelectItem value="5years">5 ans après suppression du compte (recommandé)</SelectItem>
                  <SelectItem value="10years">10 ans après suppression du compte</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Durée de conservation de vos données après la suppression de votre compte
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
          <CardTitle className="flex items-center gap-3 text-xl text-purple-800">
            <Globe className="h-6 w-6" />
            Notifications & Rapports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Notifications par email</Label>
                <p className="text-sm text-gray-600">
                  Recevoir des emails pour les événements importants
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Rapport hebdomadaire</Label>
                <p className="text-sm text-gray-600">
                  Résumé des activités de la semaine
                </p>
              </div>
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={(checked) => handleSettingChange("weeklyReports", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Digest mensuel</Label>
                <p className="text-sm text-gray-600">
                  Rapport mensuel détaillé des performances
                </p>
              </div>
              <Switch
                checked={settings.monthlyDigest}
                onCheckedChange={(checked) => handleSettingChange("monthlyDigest", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200">
          <CardTitle className="flex items-center gap-3 text-xl text-yellow-800">
            <Download className="h-6 w-6" />
            Export des Données
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-gray-600">
              Vous pouvez exporter toutes vos données à tout moment conformément au RGPD. 
              L'export inclut tous vos bilans, questionnaires, et paramètres.
            </p>
            
            <div className="flex items-center gap-4">
              <Button onClick={handleExportData} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter mes données
              </Button>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Dernier export: Jamais
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 shadow-lg border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
          <CardTitle className="flex items-center gap-3 text-xl text-red-800">
            <AlertTriangle className="h-6 w-6" />
            Zone Dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Attention:</strong> La suppression de votre compte est irréversible. 
              Toutes vos données seront supprimées définitivement après la période de rétention.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer mon compte
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirmer la suppression du compte
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Cette action est <strong>irréversible</strong>. Vous perdrez:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Tous vos bilans carbone</li>
                        <li>Vos données d'organisation</li>
                        <li>L'historique de vos questionnaires</li>
                        <li>Vos rapports et analyses</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>
                      Pour confirmer, tapez <strong>SUPPRIMER</strong> dans le champ ci-dessous:
                    </Label>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="SUPPRIMER"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Annuler
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== "SUPPRIMER"}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer définitivement
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">
          Réinitialiser
        </Button>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Sauvegarder les paramètres
        </Button>
      </div>
    </div>
  );
};