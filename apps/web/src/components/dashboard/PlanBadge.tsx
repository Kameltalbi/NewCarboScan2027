import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Star, ArrowUp } from 'lucide-react';
import { usePlanAccess } from '@/shared/hooks/usePlanAccess';
import { useNavigate } from 'react-router-dom';

interface PlanBadgeProps {
  showUpgradeButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ 
  showUpgradeButton = false, 
  size = 'md' 
}) => {
  const { userPlan, canUpgrade } = usePlanAccess();
  const navigate = useNavigate();

  const getPlanIcon = () => {
    switch (userPlan.planType) {
      case 'essential':
        return <Star className="h-3 w-3" />;
      case 'carbo_pro':
        return <Zap className="h-3 w-3" />;
      case 'carbo_expert':
        return <Crown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getPlanColor = () => {
    switch (userPlan.planType) {
      case 'essential':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'carbo_pro':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'carbo_expert':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  if (!userPlan.isActive) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Aucun plan actif
        </Badge>
        <Button
          size="sm"
          onClick={() => navigate('/pricing')}
          className="h-6 px-2 text-xs"
        >
          Choisir un plan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        className={`${getPlanColor()} ${sizeClasses[size]} border flex items-center gap-1`}
      >
        {getPlanIcon()}
        {userPlan.planName}
      </Badge>
      
      {showUpgradeButton && canUpgrade() && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/pricing')}
          className="h-6 px-2 text-xs"
        >
          <ArrowUp className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      )}
    </div>
  );
};