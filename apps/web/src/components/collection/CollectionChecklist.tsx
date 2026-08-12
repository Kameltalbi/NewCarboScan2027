// Composant principal : Checklist complète de collecte

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { CollectionGuide } from './CollectionGuide';
import { SCOPE_CONFIG } from '@/lib/types/collection-checklist';
import type { ChecklistItem, ChecklistItemsByScope } from '@/lib/types/collection-checklist';
import { CollectionChecklistService } from '@/lib/services/CollectionChecklistService';
import { cn } from '@/lib/utils';

interface CollectionChecklistProps {
  organizationId: string;
  onItemClick?: (item: ChecklistItem) => void;
}

export const CollectionChecklist = ({ 
  organizationId,
  onItemClick 
}: CollectionChecklistProps) => {
  const [loading, setLoading] = useState(true);
  const [itemsByScope, setItemsByScope] = useState<ChecklistItemsByScope[]>([]);

  useEffect(() => {
    loadChecklist();
  }, [organizationId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const items = await CollectionChecklistService.getChecklist(organizationId);
      const grouped = CollectionChecklistService.groupByScope(items);
      setItemsByScope(grouped);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Chargement de la checklist...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Checklist de collecte de données
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Collectez les données pour chaque poste afin d'obtenir un bilan carbone auditable.
          Les postes marqués <Badge variant="destructive" className="mx-1">Obligatoire</Badge> 
          sont requis pour la certification.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {itemsByScope.map((scopeGroup) => (
          <ScopeSection 
            key={scopeGroup.scope}
            scopeGroup={scopeGroup}
            onItemClick={onItemClick}
          />
        ))}
      </CardContent>
    </Card>
  );
};

// Composant : Section par Scope
interface ScopeSectionProps {
  scopeGroup: ChecklistItemsByScope;
  onItemClick?: (item: ChecklistItem) => void;
}

const ScopeSection = ({ scopeGroup, onItemClick }: ScopeSectionProps) => {
  const config = SCOPE_CONFIG[scopeGroup.scope as keyof typeof SCOPE_CONFIG];
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      {/* En-tête du scope */}
      <div 
        className="flex items-center justify-between cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3 className="font-semibold text-base">
              {config.name} : {config.description}
            </h3>
            <p className="text-sm text-muted-foreground">
              {scopeGroup.completed}/{scopeGroup.total} postes collectés
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right min-w-[100px]">
            <p className="text-lg font-bold">{scopeGroup.percentage}%</p>
            <Progress value={scopeGroup.percentage} className="h-1.5 w-20" />
          </div>
          <Badge 
            variant={scopeGroup.percentage === 100 ? 'default' : 'secondary'}
            className="ml-2"
          >
            {scopeGroup.percentage === 100 ? '✅ Complet' : `${scopeGroup.percentage}%`}
          </Badge>
        </div>
      </div>

      {/* Liste des postes */}
      {expanded && (
        <div className="ml-6 space-y-2">
          {scopeGroup.items.map((item) => (
            <ChecklistItemCard 
              key={item.id}
              item={item}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Composant : Carte d'un item de checklist
interface ChecklistItemCardProps {
  item: ChecklistItem;
  onClick?: (item: ChecklistItem) => void;
}

const ChecklistItemCard = ({ item, onClick }: ChecklistItemCardProps) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'completed':
        return `✅ Collecté (${item.data_count} données)`;
      case 'in_progress':
        return `⚠️ En cours (${item.data_count} données)`;
      default:
        return '❌ Non collecté';
    }
  };

  return (
    <Card className={cn(
      "border-l-4 transition-all hover:shadow-md",
      item.status === 'completed' && "border-l-green-500 bg-green-50/50",
      item.status === 'in_progress' && "border-l-orange-500 bg-orange-50/50",
      item.status === 'not_started' && "border-l-gray-300"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getStatusIcon()}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">
                  {item.poste_code} - {item.poste_name}
                </h4>
                {item.is_mandatory && (
                  <Badge variant="destructive" className="text-xs">
                    Obligatoire
                  </Badge>
                )}
                {item.is_csrd_required && (
                  <Badge variant="secondary" className="text-xs">
                    CSRD
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>

        {/* Guide de collecte (si non collecté) */}
        {item.status !== 'completed' && (
          <>
            <Separator />
            <CollectionGuide 
              item={item}
              onAddData={() => onClick?.(item)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
