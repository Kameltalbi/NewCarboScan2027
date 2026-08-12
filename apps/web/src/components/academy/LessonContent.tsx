import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Video, FileSpreadsheet, Download } from 'lucide-react';

export interface LessonResource {
  id: string;
  type: 'pdf' | 'video' | 'excel' | 'other';
  url: string;
  title: string | null;
}

interface LessonContentProps {
  lessonTitle: string;
  content: string | null;
  resources: LessonResource[];
  quizId?: string | null;
}

export const LessonContent: React.FC<LessonContentProps> = ({
  lessonTitle,
  content,
  resources,
  quizId
}) => {
  const pdfResources = resources.filter(r => r.type === 'pdf');
  const videoResources = resources.filter(r => r.type === 'video');
  const excelResources = resources.filter(r => r.type === 'excel');

  return (
    <div className="space-y-6">
      {/* Lesson Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{lessonTitle}</h1>
      </div>

      {/* Text Content */}
      <Card>
        <CardHeader>
          <CardTitle>Contenu du module</CardTitle>
        </CardHeader>
        <CardContent>
          {content ? (
            <div className="prose max-w-none">
              {/* Content will be rendered here when available */}
              <p className="text-gray-600">{content}</p>
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              Le contenu de ce module sera disponible prochainement.
            </p>
          )}
        </CardContent>
      </Card>

      {/* PDF Resources */}
      {pdfResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#009879]" />
              Documents PDF téléchargeables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pdfResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium">{resource.title || 'Document PDF'}</p>
                      <p className="text-sm text-muted-foreground">Format PDF</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Resources */}
      {videoResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-[#009879]" />
              Vidéos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videoResources.map((resource) => (
                <div key={resource.id} className="space-y-2">
                  <p className="font-medium">{resource.title || 'Vidéo du module'}</p>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Lecteur vidéo - URL: {resource.url}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Le lecteur vidéo sera intégré ici
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Excel Resources */}
      {excelResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#009879]" />
              Fichiers Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {excelResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">{resource.title || 'Fichier Excel'}</p>
                      <p className="text-sm text-muted-foreground">Format Excel</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholders for resources if none exist */}
      {resources.length === 0 && (
        <>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-5 h-5" />
                Documents PDF téléchargeables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                Aucun document PDF disponible pour ce module.
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Video className="w-5 h-5" />
                Vidéo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    La vidéo sera intégrée ici
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Quiz Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          {quizId ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Le quiz sera disponible ici une fois les questions ajoutées.
              </p>
              <Button variant="outline" disabled>
                Commencer le quiz
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              Aucun quiz disponible pour ce module.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};




