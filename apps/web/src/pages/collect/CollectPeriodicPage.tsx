import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodicCollectionSetup, PeriodicSessionsList } from '@/components/collect/periodic';
import { EstimationsPanel } from '@/components/collect/estimations';
import { supabase } from "@/integrations/api/client";
import { Loader2 } from 'lucide-react';

export default function CollectPeriodicPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;

      const { data, error } = await supabase
        .from('collect_sessions')
        .select('*, companies(id, nom_entreprise)')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        setSession(data);
      }
      setLoading(false);
    };

    loadSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Session non trouvée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Collecte Périodique & Estimations</h1>
        <p className="text-muted-foreground">
          Session : {session.name}
        </p>
      </div>

      <Tabs defaultValue="periodic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="periodic">Collecte Périodique</TabsTrigger>
          <TabsTrigger value="estimations">Estimations IA</TabsTrigger>
          <TabsTrigger value="upcoming">Sessions à venir</TabsTrigger>
        </TabsList>

        <TabsContent value="periodic">
          <PeriodicCollectionSetup
            sessionId={session.id}
            sessionName={session.name}
            isPeriodic={session.is_periodic}
            currentPeriodicity={session.periodicity}
            nextDueDate={session.next_due_date}
          />
        </TabsContent>

        <TabsContent value="estimations">
          <EstimationsPanel
            sessionId={session.id}
            companyId={session.company_id}
          />
        </TabsContent>

        <TabsContent value="upcoming">
          <PeriodicSessionsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
