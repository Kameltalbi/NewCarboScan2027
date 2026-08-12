import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataCategoryCardProps {
  title: string;
  icon: LucideIcon;
  progress: number;
  itemCount: number;
  totalItems: number;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export const DataCategoryCard: React.FC<DataCategoryCardProps> = ({
  title,
  icon: Icon,
  progress,
  itemCount,
  totalItems,
  onClick,
  variant = 'default',
}) => {
  const getProgressVariant = () => {
    if (progress >= 100) return 'success';
    if (progress >= 50) return 'default';
    if (progress > 0) return 'warning';
    return 'danger';
  };

  if (variant === 'compact') {
    return (
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30",
          progress === 100 && "border-emerald-200 bg-emerald-50/30"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              progress === 100 ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{title}</p>
              <p className="text-xs text-muted-foreground">{itemCount}/{totalItems} éléments</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-semibold",
                progress === 100 ? "text-emerald-600" : "text-foreground"
              )}>
                {progress}%
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          <ProgressBar value={progress} variant={getProgressVariant()} size="sm" className="mt-3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        progress === 100 && "border-emerald-200 bg-emerald-50/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-2.5 rounded-xl",
            progress === 100 ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <span className={cn(
            "text-2xl font-bold",
            progress === 100 ? "text-emerald-600" : "text-foreground"
          )}>
            {progress}%
          </span>
        </div>
        
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{itemCount} sur {totalItems} éléments</p>
        
        <ProgressBar value={progress} variant={getProgressVariant()} size="md" />
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          Ouvrir la catégorie
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
