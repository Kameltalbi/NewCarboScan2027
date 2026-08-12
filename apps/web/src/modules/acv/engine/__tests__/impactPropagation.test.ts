import { describe, it, expect } from 'vitest';
import {
  propagateImpacts,
  findRootNodes,
  findTerminalNodes,
  type ProcessNode,
  type ProcessFlow,
} from '../impactPropagation';

const makeNode = (id: string, name: string, carbon: number, output: number): ProcessNode => ({
  id,
  name,
  direct_impact: { carbon, energy: carbon * 2, water: carbon * 0.1, acidification: carbon * 0.01 },
  unit: 'kg',
  output_quantity: output,
});

describe('impactPropagation', () => {
  describe('propagation linéaire', () => {
    it('propage les impacts dans une chaîne A → B → C', () => {
      const nodes: ProcessNode[] = [
        makeNode('a', 'Minerai', 100, 1000),
        makeNode('b', 'Acier', 200, 500),
        makeNode('c', 'Poutre', 50, 100),
      ];

      const flows: ProcessFlow[] = [
        { id: 'f1', source_id: 'a', target_id: 'b', flow_name: 'Minerai → Acier', flow_type: 'intermediate', quantity: 500, unit: 'kg' },
        { id: 'f2', source_id: 'b', target_id: 'c', flow_name: 'Acier → Poutre', flow_type: 'intermediate', quantity: 100, unit: 'kg' },
      ];

      const result = propagateImpacts(nodes, flows);

      expect(result.has_cycles).toBe(false);

      // Nœud A : pas d'upstream
      const nodeA = result.nodes.find(n => n.node_id === 'a')!;
      expect(nodeA.upstream_impact.carbon).toBe(0);
      expect(nodeA.total_impact.carbon).toBe(100);

      // Nœud B : reçoit 50% de A (500/1000)
      const nodeB = result.nodes.find(n => n.node_id === 'b')!;
      expect(nodeB.upstream_impact.carbon).toBeCloseTo(50); // 100 * 0.5
      expect(nodeB.total_impact.carbon).toBeCloseTo(250); // 200 + 50

      // Nœud C : reçoit 20% de B (100/500) dont B = 250 total
      const nodeC = result.nodes.find(n => n.node_id === 'c')!;
      expect(nodeC.upstream_impact.carbon).toBeCloseTo(50); // 250 * 0.2
      expect(nodeC.total_impact.carbon).toBeCloseTo(100); // 50 + 50
    });
  });

  describe('graphe en étoile', () => {
    it('un nœud reçoit de multiples sources', () => {
      const nodes: ProcessNode[] = [
        makeNode('a', 'Acier', 100, 100),
        makeNode('b', 'Plastique', 50, 200),
        makeNode('c', 'Assemblage', 10, 50),
      ];

      const flows: ProcessFlow[] = [
        { id: 'f1', source_id: 'a', target_id: 'c', flow_name: 'Acier → Assemblage', flow_type: 'intermediate', quantity: 30, unit: 'kg' },
        { id: 'f2', source_id: 'b', target_id: 'c', flow_name: 'Plastique → Assemblage', flow_type: 'intermediate', quantity: 20, unit: 'kg' },
      ];

      const result = propagateImpacts(nodes, flows);

      const nodeC = result.nodes.find(n => n.node_id === 'c')!;
      // De A : 100 * (30/100) = 30
      // De B : 50 * (20/200) = 5
      expect(nodeC.upstream_impact.carbon).toBeCloseTo(35);
    });
  });

  describe('nœuds sans flux', () => {
    it('nœud isolé n\'a que son impact direct', () => {
      const nodes: ProcessNode[] = [makeNode('a', 'Isolé', 42, 100)];
      const result = propagateImpacts(nodes, []);

      expect(result.nodes[0].total_impact.carbon).toBe(42);
      expect(result.nodes[0].upstream_impact.carbon).toBe(0);
    });
  });

  describe('utilitaires', () => {
    it('findRootNodes identifie les racines', () => {
      const nodes: ProcessNode[] = [
        makeNode('a', 'Root', 100, 100),
        makeNode('b', 'Middle', 50, 50),
      ];
      const flows: ProcessFlow[] = [
        { id: 'f1', source_id: 'a', target_id: 'b', flow_name: 'A→B', flow_type: 'intermediate', quantity: 50, unit: 'kg' },
      ];

      const roots = findRootNodes(nodes, flows);
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('a');
    });

    it('findTerminalNodes identifie les terminaux', () => {
      const nodes: ProcessNode[] = [
        makeNode('a', 'Root', 100, 100),
        makeNode('b', 'Terminal', 50, 50),
      ];
      const flows: ProcessFlow[] = [
        { id: 'f1', source_id: 'a', target_id: 'b', flow_name: 'A→B', flow_type: 'intermediate', quantity: 50, unit: 'kg' },
      ];

      const terminals = findTerminalNodes(nodes, flows);
      expect(terminals).toHaveLength(1);
      expect(terminals[0].id).toBe('b');
    });
  });

  describe('flow contributions', () => {
    it('calcule les contributions des flux', () => {
      const nodes: ProcessNode[] = [
        makeNode('a', 'Acier', 100, 100),
        makeNode('b', 'Produit', 20, 50),
      ];

      const flows: ProcessFlow[] = [
        { id: 'f1', source_id: 'a', target_id: 'b', flow_name: 'Acier → Produit', flow_type: 'intermediate', quantity: 50, unit: 'kg' },
      ];

      const result = propagateImpacts(nodes, flows);
      expect(result.flow_contributions.length).toBeGreaterThan(0);
      expect(result.flow_contributions[0].flow_name).toBe('Acier → Produit');
    });
  });
});
