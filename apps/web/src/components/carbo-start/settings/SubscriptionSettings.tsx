import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Crown, 
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";

export const SubscriptionSettings: React.FC = () => {
  const [currentPlan] = useState({
    name: "CarboScan",
    price: "2500 DT/an",
    bilansRemaining: 3, // Vous avez encore tous vos bilans
    bilansTotal: 3,
    renewalDate: "2025-07-20",
    status: "active"
  });

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
          <CardTitle className="flex items-center gap-3 text-xl text-green-800">
            <Crown className="h-6 w-6" />
            Abonnement Actuel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-green-700">{currentPlan.name}</h3>
                <p className="text-lg text-gray-600">{currentPlan.price}</p>
                <Badge variant="outline" className="mt-2 bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Renouvellement le {new Date(currentPlan.renewalDate).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {Math.ceil((new Date(currentPlan.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} jours restants
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Utilisation des bilans</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Bilans utilisés</span>
                    <span className="font-medium">
                      {currentPlan.bilansTotal - currentPlan.bilansRemaining}/{currentPlan.bilansTotal}
                    </span>
                  </div>
                  <Progress 
                    value={((currentPlan.bilansTotal - currentPlan.bilansRemaining) / currentPlan.bilansTotal) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500">
                    {currentPlan.bilansRemaining} bilans restants cette année
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Modifier le renouvellement
              </Button>
              <Button className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Contacter le support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};