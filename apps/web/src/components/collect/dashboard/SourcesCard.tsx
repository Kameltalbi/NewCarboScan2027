import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database,
  FileSpreadsheet,
  FileText,
  Wifi,
  Users,
  PenLine,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DataSource {
  id: string;
  type: 'manual' | 'excel' | 'ocr' | 'api' | 'supplier';
  label: string;
  count: number;
  lastActivity?: Date;
}

interface SourcesCardProps {
  sources: DataSource[];
}

export const SourcesCard: React.FC<SourcesCardProps> = ({ sources }) => {
  const getSourceIcon = (type: DataSource['type']) => {
    switch (type) {
      case 'manual':
        return <PenLine className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'ocr':
        return <FileText className="h-4 w-4" />;
      case 'api':
        return <Wifi className="h-4 w-4" />;
      case 'supplier':
        return <Users className="h-4 w-4" />;
    }
  };

  const getSourceColor = (type: DataSource['type']) => {
    switch (type) {
      case 'manual':
        return 'bg-blue-100 text-blue-600';
      case 'excel':
        return 'bg-emerald-100 text-emerald-600';
      case 'ocr':
        return 'bg-violet-100 text-violet-600';
      case 'api':
        return 'bg-amber-100 text-amber-600';
      case 'supplier':
        return 'bg-rose-100 text-rose-600';
    }
  };

  const totalCount = sources.reduce((acc, s) => acc + s.count, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Sources de données
          </span>
          <Badge variant="secondary">{totalCount} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", getSourceColor(source.type))}>
                {getSourceIcon(source.type)}
              </div>
              <div>
                <p className="text-sm font-medium">{source.label}</p>
                {source.lastActivity && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(source.lastActivity, { addSuffix: true, locale: fr })}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="font-semibold">
              {source.count}
            </Badge>
          </div>
        ))}

        {sources.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Database className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune donnée importée</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
