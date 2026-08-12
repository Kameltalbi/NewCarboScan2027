import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationSettings } from "./OrganizationSettings";
import { UserManagement } from "./UserManagement";
import { SubscriptionSettings } from "./SubscriptionSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { Building2, Users, CreditCard, Settings } from "lucide-react";

export const CarboScanSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState("organization");

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Paramètres CarboScan
        </h1>
        <p className="text-gray-600 text-lg">
          Gérez les paramètres de votre organisation et de votre compte
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white shadow-sm">
          <TabsTrigger 
            value="organization" 
            className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organisation</span>
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger 
            value="subscription" 
            className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Abonnement</span>
          </TabsTrigger>
          <TabsTrigger 
            value="advanced" 
            className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Avancés</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-6">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionSettings />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <AdvancedSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};