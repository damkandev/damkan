import type { GraphNode, GraphSnapshot, NodeId, SimulationStrategy } from "../types";

const GRAVITY = 400;
const DAMPING = 0.98;
const CONSTRAINT_PASSES = 4;
const DEFAULT_REST_LENGTH = 80;

export class VerletStrategy implements SimulationStrategy {
  private graph: GraphSnapshot | null = null;
  private prev = new Map<NodeId, { x: number; y: number }>();
  private bounds = { width: 1000, height: 600 };
  private restLength: number;

  constructor(bounds?: { width: number; height: number }, restLength = DEFAULT_REST_LENGTH) {
    if (bounds) this.bounds = bounds;
    this.restLength = restLength;
  }

  init(graph: GraphSnapshot): void {
    this.graph = graph;
    this.prev.clear();
    for (const n of graph.nodes) this.prev.set(n.id, { x: n.x, y: n.y });
  }

  step(dt: number): void {
    if (!this.graph) return;
    const { nodes, edges } = this.graph;

    for (const n of nodes) {
      if (n.fixed) continue;
      const p = this.prev.get(n.id) ?? { x: n.x, y: n.y };
      const newX = n.x + (n.x - p.x) * DAMPING;
      const newY = n.y + (n.y - p.y) * DAMPING + GRAVITY * dt * dt;
      this.prev.set(n.id, { x: n.x, y: n.y });
      n.x = newX;
      n.y = newY;
    }

    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (let pass = 0; pass < CONSTRAINT_PASSES; pass++) {
      for (const edge of edges) {
        const a = byId.get(edge.a);
        const b = byId.get(edge.b);
        if (!a || !b) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const diff = (dist - this.restLength) / dist;
        const correction = 0.5 * diff;

        if (!a.fixed) {
          a.x += dx * correction;
          a.y += dy * correction;
        }
        if (!b.fixed) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        }
      }
    }

    for (const n of nodes) {
      n.x = Math.max(0, Math.min(this.bounds.width, n.x));
      n.y = Math.max(0, Math.min(this.bounds.height, n.y));
    }
  }

  onDragStart(nodeId: NodeId): void {
    const node = this.findNode(nodeId);
    if (node) node.fixed = true;
  }

  onDragMove(nodeId: NodeId, x: number, y: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    this.prev.set(nodeId, { x, y });
  }

  onDragEnd(nodeId: NodeId): void {
    const node = this.findNode(nodeId);
    if (node) node.fixed = false;
  }

  private findNode(id: NodeId): GraphNode | undefined {
    return this.graph?.nodes.find((n) => n.id === id);
  }
}
