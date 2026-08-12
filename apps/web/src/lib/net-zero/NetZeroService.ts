// Service de gestion des trajectoires Net Zero
// Stocke les configurations dans Supabase

import { supabase } from "@/integrations/api/client";
import { NetZeroTrajectory, NetZeroReference, NetZeroObjective, ReductionLever, NetZeroScenario } from './types';

export class NetZeroService {
  /**
   * Récupérer la trajectoire Net Zero d'une organisation
   */
  static async getTrajectory(organizationId: string): Promise<NetZeroTrajectory | null> {
    const { data, error } = await supabase
      .from('net_zero_trajectories')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.config as NetZeroTrajectory;
  }

  /**
   * Sauvegarder la trajectoire Net Zero
   */
  static async saveTrajectory(
    organizationId: string,
    trajectory: NetZeroTrajectory
  ): Promise<void> {
    const { error } = await supabase
      .from('net_zero_trajectories')
      .upsert({
        organization_id: organizationId,
        config: trajectory,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  }

  /**
   * Verrouiller l'année de référence
   */
  static async lockReference(
    organizationId: string,
    reference: NetZeroReference
  ): Promise<void> {
    const trajectory = await this.getTrajectory(organizationId);
    if (!trajectory) {
      throw new Error('Trajectoire non trouvée');
    }

    const updatedTrajectory: NetZeroTrajectory = {
      ...trajectory,
      reference: {
        ...reference,
        locked: true,
        locked_at: new Date().toISOString(),
      },
    };

    await this.saveTrajectory(organizationId, updatedTrajectory);
  }

  /**
   * Ajouter un objectif
   */
  static async addObjective(
    organizationId: string,
    objective: NetZeroObjective
  ): Promise<void> {
    const trajectory = await this.getTrajectory(organizationId);
    if (!trajectory) {
      throw new Error('Trajectoire non trouvée');
    }

    const updatedTrajectory: NetZeroTrajectory = {
      ...trajectory,
      objectives: [...trajectory.objectives, objective],
    };

    await this.saveTrajectory(organizationId, updatedTrajectory);
  }

  /**
   * Ajouter un levier de réduction
   */
  static async addLever(
    organizationId: string,
    lever: ReductionLever
  ): Promise<void> {
    const trajectory = await this.getTrajectory(organizationId);
    if (!trajectory) {
      throw new Error('Trajectoire non trouvée');
    }

    const updatedTrajectory: NetZeroTrajectory = {
      ...trajectory,
      levers: [...trajectory.levers, lever],
    };

    await this.saveTrajectory(organizationId, updatedTrajectory);
  }

  /**
   * Mettre à jour un scénario
   */
  static async updateScenario(
    organizationId: string,
    scenario: NetZeroScenario
  ): Promise<void> {
    const trajectory = await this.getTrajectory(organizationId);
    if (!trajectory) {
      throw new Error('Trajectoire non trouvée');
    }

    const updatedScenarios = trajectory.scenarios.filter((s) => s.id !== scenario.id);
    updatedScenarios.push(scenario);

    const updatedTrajectory: NetZeroTrajectory = {
      ...trajectory,
      scenarios: updatedScenarios,
      current_scenario_id: scenario.id,
    };

    await this.saveTrajectory(organizationId, updatedTrajectory);
  }
}

