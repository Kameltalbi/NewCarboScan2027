// Alerts & Priorities Section - Compact, actionable alerts
// Concise and focused on decision support

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  FileQuestion, 
  Clock, 
  Lightbulb,
  ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertPriority = 'high' | 'medium' | 'low';
export type AlertType = 'missing_data' | 'blocked' | 'recommendation';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  message: string;
  action?: {
    label: string;
    route: string;
  };
}

interface AlertsSectionProps {
  alerts: Alert[];
}

const ALERT_ICONS = {
  missing_data: FileQuestion,
  blocked: AlertTriangle,
  recommendation: Lightbulb,
};

const PRIORITY_STYLES = {
  high: 'border-l-red-500 bg-red-50/50',
  medium: 'border-l-amber-500 bg-amber-50/50',
  low: 'border-l-blue-500 bg-blue-50/50',
};

export const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  const navigate = useNavigate();
  
  if (alerts.length === 0) {
    return null;
  }

  // Sort by priority
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="border rounded">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Alertes et priorités
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedAlerts.slice(0, 5).map((alert) => {
            const Icon = ALERT_ICONS[alert.type];
            
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between gap-4 p-3 rounded border-l-4 transition-colors',
                  PRIORITY_STYLES[alert.priority]
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">
                    {alert.message}
                  </span>
                </div>
                {alert.action && (
                  <button
                    onClick={() => navigate(alert.action!.route)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                  >
                    {alert.action.label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to generate alerts based on dashboard data
export const generateAlerts = (
  dataQuality: { real: number; estimated: number; default: number },
  hasData: boolean,
  hasIncompleteData: boolean,
  bilanBreakdown: { category: string; percentage: number }[],
  hasBilanCarbone: boolean,
  hasNetZero: boolean
): Alert[] => {
  const alerts: Alert[] = [];

  // Missing data alerts
  if (!hasData) {
    alerts.push({
      id: 'no-data',
      type: 'missing_data',
      priority: 'high',
      message: 'Aucune donnée collectée pour cette période',
      action: { label: 'Collecter', route: '/app/collecte' },
    });
  }

  if (dataQuality.default > 30) {
    alerts.push({
      id: 'high-default',
      type: 'missing_data',
      priority: 'high',
      message: `${dataQuality.default.toFixed(0)}% des données sont manquantes`,
      action: { label: 'Compléter', route: '/app/collecte' },
    });
  }

  if (hasIncompleteData && dataQuality.estimated > 50) {
    alerts.push({
      id: 'high-estimated',
      type: 'missing_data',
      priority: 'medium',
      message: `${dataQuality.estimated.toFixed(0)}% des données sont estimées`,
      action: { label: 'Affiner', route: '/app/collecte' },
    });
  }

  // Recommendations
  if (hasBilanCarbone && bilanBreakdown.length > 0) {
    const topCategory = bilanBreakdown.reduce((max, curr) => 
      curr.percentage > max.percentage ? curr : max
    );
    
    if (topCategory.percentage > 40) {
      alerts.push({
        id: 'top-emitter',
        type: 'recommendation',
        priority: 'low',
        message: `"${topCategory.category}" représente ${topCategory.percentage.toFixed(0)}% des émissions`,
        action: { label: 'Analyser', route: '/app/bilan-carbone' },
      });
    }
  }

  if (hasBilanCarbone && !hasNetZero && hasData) {
    alerts.push({
      id: 'no-trajectory',
      type: 'recommendation',
      priority: 'low',
      message: 'Aucune trajectoire de décarbonation définie',
      action: { label: 'Créer', route: '/app/net-zero' },
    });
  }

  return alerts;
};
