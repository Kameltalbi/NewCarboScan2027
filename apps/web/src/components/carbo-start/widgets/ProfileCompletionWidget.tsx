import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionWidgetProps {
  userProfile: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
  };
}

export const ProfileCompletionWidget: React.FC<ProfileCompletionWidgetProps> = ({ userProfile }) => {
  const navigate = useNavigate();
  
  const calculateCompleteness = () => {
    const { firstName, lastName, company } = userProfile;
    let completed = 0;
    let total = 3;
    
    if (firstName) completed++;
    if (lastName) completed++;
    if (company) completed++;
    
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const { completed, total, percentage } = calculateCompleteness();
  const isComplete = completed === total;
  const needsAttention = completed < 2;

  if (isComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Profil complet</p>
              <p className="text-xs text-green-600">Toutes les informations sont renseignées</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${needsAttention ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className={`h-4 w-4 ${needsAttention ? 'text-orange-600' : 'text-blue-600'}`} />
          Profil Utilisateur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Complété</span>
            <span className={`font-medium ${needsAttention ? 'text-orange-600' : 'text-blue-600'}`}>
              {completed}/{total} ({percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                needsAttention ? 'bg-orange-500' : 'bg-blue-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Missing Fields */}
        <div className="space-y-2">
          <p className="text-xs text-gray-600 font-medium">Informations manquantes :</p>
          <div className="space-y-1">
            {!userProfile.firstName && (
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Prénom</span>
              </div>
            )}
            {!userProfile.lastName && (
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Nom de famille</span>
              </div>
            )}
            {!userProfile.company && (
              <div className="flex items-center gap-2 text-xs">
                <Building2 className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Organisation</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {needsAttention && (
          <div className="bg-orange-100 border border-orange-200 rounded p-2">
            <div className="text-xs text-orange-700 font-medium mb-1">
              ⚠️ Action recommandée
            </div>
            <div className="text-xs text-orange-600">
              Complétez votre profil pour une expérience personnalisée
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/carbo-start/settings')}
          className={`w-full text-xs ${
            needsAttention 
              ? 'border-orange-300 text-orange-700 hover:bg-orange-50' 
              : 'border-blue-300 text-blue-700 hover:bg-blue-50'
          }`}
        >
          <Settings className="h-3 w-3 mr-1" />
          Compléter le profil
        </Button>
      </CardContent>
    </Card>
  );
}; 