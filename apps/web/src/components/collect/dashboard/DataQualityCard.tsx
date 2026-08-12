import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataQualityStats {
  ocrValid: number;
  ocrInvalid: number;
  aiConfidenceScore: number;
  duplicates: number;
  errors: number;
}

interface DataQualityCardProps {
  stats: DataQualityStats;
}

export const DataQualityCard: React.FC<DataQualityCardProps> = ({ stats }) => {
  const qualityScore = Math.round(
    ((stats.ocrValid / Math.max(stats.ocrValid + stats.ocrInvalid, 1)) * 50) +
    (stats.aiConfidenceScore * 0.5) -
    (stats.errors * 5) -
    (stats.duplicates * 2)
  );

  const getScoreColor = () => {
    if (qualityScore >= 80) return 'text-emerald-600';
    if (qualityScore >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getScoreBg = () => {
    if (qualityScore >= 80) return 'bg-emerald-100';
    if (qualityScore >= 60) return 'bg-amber-100';
    return 'bg-rose-100';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Qualité des données
          </span>
          <Badge className={cn(getScoreBg(), getScoreColor(), 'border-0')}>
            Score: {Math.max(0, qualityScore)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* OCR Stats */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="text-sm">OCR Validés</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {stats.ocrValid}
            </Badge>
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
              <XCircle className="h-3 w-3 mr-1" />
              {stats.ocrInvalid}
            </Badge>
          </div>
        </div>

        {/* AI Confidence */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Confiance IA</span>
          </div>
          <span className={cn(
            "font-semibold text-sm",
            stats.aiConfidenceScore >= 80 ? "text-emerald-600" : 
            stats.aiConfidenceScore >= 60 ? "text-amber-600" : "text-rose-600"
          )}>
            {stats.aiConfidenceScore}%
          </span>
        </div>

        {/* Duplicates */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Doublons détectés</span>
          </div>
          <Badge variant={stats.duplicates > 0 ? "destructive" : "secondary"}>
            {stats.duplicates}
          </Badge>
        </div>

        {/* Errors */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Erreurs</span>
          </div>
          <Badge variant={stats.errors > 0 ? "destructive" : "secondary"}>
            {stats.errors}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
