import type { GraphNode, GraphSnapshot, NodeId, SimulationStrategy } from "../types";

const DEFAULT_REST_LENGTH = 80;
const EASE = 0.08;
const HOP_DECAY = 0.7;
const MAX_HOPS = 3;
const GRAVITY_EASE = 0.01;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class DragPropagationStrategy implements SimulationStrategy {
  private graph: GraphSnapshot | null = null;
  private adjacency = new Map<NodeId, NodeId[]>();
  private draggingId: NodeId | null = null;
  private gravityTargetY = 360;
  private restLength: number;

  constructor(restLength = DEFAULT_REST_LENGTH) {
    this.restLength = restLength;
  }

  init(graph: GraphSnapshot): void {
    this.graph = graph;
    this.adjacency.clear();
    for (const n of graph.nodes) this.adjacency.set(n.id, []);
    for (const e of graph.edges) {
      this.adjacency.get(e.a)?.push(e.b);
      this.adjacency.get(e.b)?.push(e.a);
    }
  }

  step(): void {
    if (!this.graph) return;

    for (const n of this.graph.nodes) {
      if (n.fixed || n.id === this.draggingId) continue;
      n.y = lerp(n.y, this.gravityTargetY, GRAVITY_EASE);
    }
  }

  onDragStart(nodeId: NodeId): void {
    this.draggingId = nodeId;
    const node = this.findNode(nodeId);
    if (node) node.fixed = true;
  }

  onDragMove(nodeId: NodeId, x: number, y: number): void {
    if (!this.graph) return;
    const node = this.findNode(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;

    const byId = new Map(this.graph.nodes.map((n) => [n.id, n]));
    const visited = new Set<NodeId>([nodeId]);
    let frontier = [nodeId];
    for (let hop = 1; hop <= MAX_HOPS; hop++) {
      const next: NodeId[] = [];
      const ease = EASE * Math.pow(HOP_DECAY, hop - 1);
      for (const fromId of frontier) {
        const from = byId.get(fromId);
        if (!from) continue;
        for (const neighborId of this.adjacency.get(fromId) ?? []) {
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          next.push(neighborId);
          const neighbor = byId.get(neighborId);
          if (!neighbor || neighbor.fixed) continue;
          const dx = neighbor.x - from.x;
          const dy = neighbor.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          const targetX = from.x + (dx / dist) * this.restLength;
          const targetY = from.y + (dy / dist) * this.restLength;
          neighbor.x = lerp(neighbor.x, targetX, ease);
          neighbor.y = lerp(neighbor.y, targetY, ease);
        }
      }
      frontier = next;
    }
  }

  onDragEnd(nodeId: NodeId): void {
    this.draggingId = null;
    const node = this.findNode(nodeId);
    if (node) node.fixed = false;
  }

  private findNode(id: NodeId): GraphNode | undefined {
    return this.graph?.nodes.find((n) => n.id === id);
  }
}
