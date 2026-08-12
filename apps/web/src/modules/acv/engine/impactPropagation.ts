/**
 * Moteur de propagation des impacts ACV
 * 
 * Modélise les flux intermédiaires entre processus et propage
 * les impacts environnementaux à travers le graphe du système produit.
 * 
 * Graphe orienté : chaque nœud est un composant/processus,
 * chaque arête est un flux intermédiaire (matière, énergie, déchet).
 */

import type { ACVImpactResult } from '../types';

// ============================================
// TYPES
// ============================================

export type FlowType = 'intermediate' | 'elementary_input' | 'elementary_output' | 'waste' | 'co_product';

export interface ProcessNode {
  id: string;
  name: string;
  direct_impact: ACVImpactResult;  // Impact direct du processus
  unit: string;
  output_quantity: number;         // Quantité produite par ce processus
}

export interface ProcessFlow {
  id: string;
  source_id: string;              // ID du nœud source
  target_id: string;              // ID du nœud cible
  flow_name: string;
  flow_type: FlowType;
  quantity: number;               // Quantité transférée
  unit: string;
}

export interface PropagatedNodeResult {
  node_id: string;
  node_name: string;
  direct_impact: ACVImpactResult;
  upstream_impact: ACVImpactResult;   // Impacts hérités des processus amont
  total_impact: ACVImpactResult;      // direct + upstream
  depth: number;                       // Profondeur dans le graphe
  upstream_sources: string[];          // IDs des nœuds contributeurs
}

export interface PropagationResult {
  nodes: PropagatedNodeResult[];
  total_system_impact: ACVImpactResult;
  flow_contributions: FlowContribution[];
  has_cycles: boolean;
  warnings: string[];
}

export interface FlowContribution {
  flow_id: string;
  flow_name: string;
  source_name: string;
  target_name: string;
  impact_transferred: ACVImpactResult;
  percentage_of_total: number;
}

// ============================================
// GRAPHE & PROPAGATION
// ============================================

const ZERO: ACVImpactResult = { carbon: 0, energy: 0, water: 0, acidification: 0 };

function addImpacts(a: ACVImpactResult, b: ACVImpactResult): ACVImpactResult {
  return {
    carbon: a.carbon + b.carbon,
    energy: a.energy + b.energy,
    water: a.water + b.water,
    acidification: a.acidification + b.acidification,
  };
}

function scaleImpact(impact: ACVImpactResult, factor: number): ACVImpactResult {
  return {
    carbon: impact.carbon * factor,
    energy: impact.energy * factor,
    water: impact.water * factor,
    acidification: impact.acidification * factor,
  };
}

/**
 * Propage les impacts à travers le graphe de processus.
 * 
 * Algorithme : tri topologique puis propagation forward.
 * Si le graphe contient des cycles, utilise une approche itérative
 * avec convergence (max 50 itérations).
 */
export function propagateImpacts(
  nodes: ProcessNode[],
  flows: ProcessFlow[]
): PropagationResult {
  const warnings: string[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Construire l'adjacence
  const incomingFlows = new Map<string, ProcessFlow[]>();
  const outgoingFlows = new Map<string, ProcessFlow[]>();
  
  for (const node of nodes) {
    incomingFlows.set(node.id, []);
    outgoingFlows.set(node.id, []);
  }

  for (const flow of flows) {
    if (!nodeMap.has(flow.source_id) || !nodeMap.has(flow.target_id)) {
      warnings.push(`Flux "${flow.flow_name}" référence un nœud inexistant`);
      continue;
    }
    incomingFlows.get(flow.target_id)?.push(flow);
    outgoingFlows.get(flow.source_id)?.push(flow);
  }

  // Tri topologique (Kahn's algorithm)
  const order = topologicalSort(nodes, flows);
  const hasCycles = order === null;

  if (hasCycles) {
    warnings.push('Cycle détecté dans le graphe — utilisation de l\'approche itérative');
  }

  // Propager les impacts
  const propagated = new Map<string, ACVImpactResult>();
  const depths = new Map<string, number>();
  const upstreamSources = new Map<string, Set<string>>();

  // Initialiser
  for (const node of nodes) {
    propagated.set(node.id, { ...ZERO });
    depths.set(node.id, 0);
    upstreamSources.set(node.id, new Set());
  }

  const processingOrder = order ?? nodes.map(n => n.id);

  if (hasCycles) {
    // Approche itérative pour graphes cycliques
    propagateIterative(processingOrder, nodeMap, incomingFlows, propagated, depths, upstreamSources);
  } else {
    // Propagation forward directe
    propagateForward(processingOrder, nodeMap, incomingFlows, propagated, depths, upstreamSources);
  }

  // Construire les résultats
  const nodeResults: PropagatedNodeResult[] = nodes.map(node => {
    const upstream = propagated.get(node.id) ?? { ...ZERO };
    const total = addImpacts(node.direct_impact, upstream);

    return {
      node_id: node.id,
      node_name: node.name,
      direct_impact: node.direct_impact,
      upstream_impact: upstream,
      total_impact: total,
      depth: depths.get(node.id) ?? 0,
      upstream_sources: Array.from(upstreamSources.get(node.id) ?? []),
    };
  });

  // Impact total système
  // Seuls les nœuds "terminaux" (sans flux sortant de type intermediate) comptent
  const terminalNodes = nodes.filter(n => {
    const outgoing = outgoingFlows.get(n.id) ?? [];
    return outgoing.filter(f => f.flow_type === 'intermediate').length === 0;
  });

  const totalSystemImpact = terminalNodes.length > 0
    ? nodeResults
        .filter(nr => terminalNodes.some(tn => tn.id === nr.node_id))
        .reduce((acc, nr) => addImpacts(acc, nr.total_impact), { ...ZERO })
    : nodeResults.reduce((acc, nr) => addImpacts(acc, nr.total_impact), { ...ZERO });

  // Contributions des flux
  const flowContributions = calculateFlowContributions(flows, nodeMap, propagated, totalSystemImpact);

  return {
    nodes: nodeResults,
    total_system_impact: totalSystemImpact,
    flow_contributions: flowContributions,
    has_cycles: hasCycles,
    warnings,
  };
}

// ============================================
// ALGORITHMES INTERNES
// ============================================

function topologicalSort(nodes: ProcessNode[], flows: ProcessFlow[]): string[] | null {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const flow of flows) {
    if (flow.flow_type !== 'intermediate') continue;
    if (!inDegree.has(flow.source_id) || !inDegree.has(flow.target_id)) continue;
    adj.get(flow.source_id)?.push(flow.target_id);
    inDegree.set(flow.target_id, (inDegree.get(flow.target_id) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return order.length === nodes.length ? order : null; // null = cycle
}

function propagateForward(
  order: string[],
  nodeMap: Map<string, ProcessNode>,
  incomingFlows: Map<string, ProcessFlow[]>,
  propagated: Map<string, ACVImpactResult>,
  depths: Map<string, number>,
  upstreamSources: Map<string, Set<string>>
): void {
  for (const nodeId of order) {
    const incoming = incomingFlows.get(nodeId) ?? [];

    for (const flow of incoming) {
      if (flow.flow_type !== 'intermediate') continue;

      const sourceNode = nodeMap.get(flow.source_id);
      if (!sourceNode || sourceNode.output_quantity <= 0) continue;

      // Facteur de scaling : quantité du flux / quantité produite par le source
      const scaleFactor = flow.quantity / sourceNode.output_quantity;

      // Impact propagé = (impact direct source + upstream source) × scale
      const sourceUpstream = propagated.get(flow.source_id) ?? { ...ZERO };
      const sourceTotalImpact = addImpacts(sourceNode.direct_impact, sourceUpstream);
      const transferredImpact = scaleImpact(sourceTotalImpact, scaleFactor);

      // Ajouter au nœud cible
      const currentUpstream = propagated.get(nodeId) ?? { ...ZERO };
      propagated.set(nodeId, addImpacts(currentUpstream, transferredImpact));

      // Mettre à jour la profondeur
      const sourceDepth = depths.get(flow.source_id) ?? 0;
      depths.set(nodeId, Math.max(depths.get(nodeId) ?? 0, sourceDepth + 1));

      // Traçabilité
      upstreamSources.get(nodeId)?.add(flow.source_id);
      for (const src of upstreamSources.get(flow.source_id) ?? []) {
        upstreamSources.get(nodeId)?.add(src);
      }
    }
  }
}

function propagateIterative(
  nodeIds: string[],
  nodeMap: Map<string, ProcessNode>,
  incomingFlows: Map<string, ProcessFlow[]>,
  propagated: Map<string, ACVImpactResult>,
  depths: Map<string, number>,
  upstreamSources: Map<string, Set<string>>
): void {
  const MAX_ITERATIONS = 50;
  const CONVERGENCE_THRESHOLD = 0.001; // 0.1%

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let maxChange = 0;

    for (const nodeId of nodeIds) {
      const incoming = incomingFlows.get(nodeId) ?? [];
      let newUpstream: ACVImpactResult = { ...ZERO };

      for (const flow of incoming) {
        if (flow.flow_type !== 'intermediate') continue;

        const sourceNode = nodeMap.get(flow.source_id);
        if (!sourceNode || sourceNode.output_quantity <= 0) continue;

        const scaleFactor = flow.quantity / sourceNode.output_quantity;
        const sourceUpstream = propagated.get(flow.source_id) ?? { ...ZERO };
        const sourceTotalImpact = addImpacts(sourceNode.direct_impact, sourceUpstream);
        const transferredImpact = scaleImpact(sourceTotalImpact, scaleFactor);

        newUpstream = addImpacts(newUpstream, transferredImpact);

        const sourceDepth = depths.get(flow.source_id) ?? 0;
        depths.set(nodeId, Math.max(depths.get(nodeId) ?? 0, sourceDepth + 1));
        upstreamSources.get(nodeId)?.add(flow.source_id);
      }

      const old = propagated.get(nodeId) ?? { ...ZERO };
      const change = Math.abs(newUpstream.carbon - old.carbon) / Math.max(Math.abs(old.carbon), 0.001);
      maxChange = Math.max(maxChange, change);

      propagated.set(nodeId, newUpstream);
    }

    if (maxChange < CONVERGENCE_THRESHOLD) break;
  }
}

function calculateFlowContributions(
  flows: ProcessFlow[],
  nodeMap: Map<string, ProcessNode>,
  propagated: Map<string, ACVImpactResult>,
  totalImpact: ACVImpactResult
): FlowContribution[] {
  return flows
    .filter(f => f.flow_type === 'intermediate')
    .map(flow => {
      const sourceNode = nodeMap.get(flow.source_id);
      const targetNode = nodeMap.get(flow.target_id);
      if (!sourceNode || !targetNode) {
        return null;
      }

      const scaleFactor = sourceNode.output_quantity > 0
        ? flow.quantity / sourceNode.output_quantity : 0;

      const sourceUpstream = propagated.get(flow.source_id) ?? { ...ZERO };
      const sourceTotalImpact = addImpacts(sourceNode.direct_impact, sourceUpstream);
      const transferred = scaleImpact(sourceTotalImpact, scaleFactor);

      return {
        flow_id: flow.id,
        flow_name: flow.flow_name,
        source_name: sourceNode.name,
        target_name: targetNode.name,
        impact_transferred: transferred,
        percentage_of_total: totalImpact.carbon > 0
          ? (transferred.carbon / totalImpact.carbon) * 100 : 0,
      };
    })
    .filter((f): f is FlowContribution => f !== null)
    .sort((a, b) => b.percentage_of_total - a.percentage_of_total);
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Convertit des composants ACV en nœuds de processus pour la propagation
 */
export function componentsToProcessNodes(
  components: Array<{
    id: string;
    component_name: string;
    quantity: number;
    unit: string;
  }>,
  componentImpacts: Map<string, ACVImpactResult>
): ProcessNode[] {
  return components.map(c => ({
    id: c.id,
    name: c.component_name,
    direct_impact: componentImpacts.get(c.id) ?? { ...ZERO },
    unit: c.unit,
    output_quantity: c.quantity,
  }));
}

/**
 * Identifie les nœuds racines (sans flux entrant)
 */
export function findRootNodes(nodes: ProcessNode[], flows: ProcessFlow[]): ProcessNode[] {
  const hasIncoming = new Set(flows.filter(f => f.flow_type === 'intermediate').map(f => f.target_id));
  return nodes.filter(n => !hasIncoming.has(n.id));
}

/**
 * Identifie les nœuds terminaux (sans flux sortant intermédiaire)
 */
export function findTerminalNodes(nodes: ProcessNode[], flows: ProcessFlow[]): ProcessNode[] {
  const hasOutgoing = new Set(flows.filter(f => f.flow_type === 'intermediate').map(f => f.source_id));
  return nodes.filter(n => !hasOutgoing.has(n.id));
}
