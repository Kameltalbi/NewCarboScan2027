// Composant pour gérer le DataRoom CSRD (justificatifs)

import React, { useState, useEffect } from 'react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { CollectDataRoomService, CollectDocument, DocumentType } from '@/lib/activity-data/CollectDataRoomService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FolderOpen, Upload, FileText, Download, Trash2, Link2, X, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const CollectDataRoom: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<CollectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<CollectDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    document_type: 'invoice' as DocumentType,
    category: '',
    tags: '',
    period_start: '',
    period_end: '',
  });
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (organizationId) {
      loadDocuments();
    }
  }, [organizationId, filterType, filterCategory]);

  const loadDocuments = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const filters: any = {};
      if (filterType !== 'all') {
        filters.document_type = filterType;
      }
      if (filterCategory !== 'all') {
        filters.category = filterCategory;
      }
      const data = await CollectDataRoomService.list(organizationId, filters);
      setDocuments(data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du chargement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData({ ...formData, name: file.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!organizationId || !selectedFile) return;

    setUploading(true);
    try {
      // Upload vers Storage
      const { path } = await CollectDataRoomService.uploadFile(selectedFile, organizationId);

      // Créer l'enregistrement
      await CollectDataRoomService.create({
        organization_id: organizationId,
        name: formData.name || selectedFile.name,
        description: formData.description || undefined,
        document_type: formData.document_type,
        category: formData.category || undefined,
        storage_path: path,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
        period_start: formData.period_start || undefined,
        period_end: formData.period_end || undefined,
      });

      toast({
        title: 'Document uploadé',
        description: 'Le document a été ajouté au DataRoom.',
      });

      setShowUploadDialog(false);
      setSelectedFile(null);
      setFormData({
        name: '',
        description: '',
        document_type: 'invoice',
        category: '',
        tags: '',
        period_start: '',
        period_end: '',
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'upload',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDocument) return;

    try {
      await CollectDataRoomService.delete(deletingDocument.id);
      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé.',
      });
      setDeletingDocument(null);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (document: CollectDocument) => {
    const url = CollectDataRoomService.getPublicUrl(document);
    window.open(url, '_blank');
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      invoice: 'Facture',
      receipt: 'Reçu',
      certificate: 'Certificat',
      report: 'Rapport',
      contract: 'Contrat',
      measurement: 'Mesure',
      other: 'Autre',
    };
    return labels[type];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>DataRoom CSRD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                DataRoom CSRD
              </CardTitle>
              <CardDescription>
                Stockage et organisation des justificatifs pour la collecte de données
              </CardDescription>
            </div>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Type de document</Label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as DocumentType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="receipt">Reçu</SelectItem>
                  <SelectItem value="certificate">Certificat</SelectItem>
                  <SelectItem value="report">Rapport</SelectItem>
                  <SelectItem value="contract">Contrat</SelectItem>
                  <SelectItem value="measurement">Mesure</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Catégorie</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="scope1">Scope 1</SelectItem>
                  <SelectItem value="scope2">Scope 2</SelectItem>
                  <SelectItem value="scope3">Scope 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Liste des documents */}
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document dans le DataRoom</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          {doc.description && (
                            <div className="text-sm text-muted-foreground">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getDocumentTypeLabel(doc.document_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.category && <Badge variant="secondary">{doc.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{doc.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {doc.activity_data_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Lié à une donnée"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingDocument(doc)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>
              Uploader un justificatif dans le DataRoom CSRD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Fichier *</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du document"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du document..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">Type *</Label>
                <Select value={formData.document_type} onValueChange={(value) => setFormData({ ...formData, document_type: value as DocumentType })}>
                  <SelectTrigger id="document_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Facture</SelectItem>
                    <SelectItem value="receipt">Reçu</SelectItem>
                    <SelectItem value="certificate">Certificat</SelectItem>
                    <SelectItem value="report">Rapport</SelectItem>
                    <SelectItem value="contract">Contrat</SelectItem>
                    <SelectItem value="measurement">Mesure</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={formData.category || 'none'} onValueChange={(value) => setFormData({ ...formData, category: value === 'none' ? null : value })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="scope1">Scope 1</SelectItem>
                    <SelectItem value="scope2">Scope 2</SelectItem>
                    <SelectItem value="scope3">Scope 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">Période début</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Période fin</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="facture, énergie, 2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !formData.name}>
              {uploading ? 'Upload en cours...' : 'Uploader'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingDocument} onOpenChange={(open) => !open && setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
