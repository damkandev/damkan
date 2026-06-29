import type { GraphNode, GraphSnapshot, NodeId, SimulationStrategy } from "../types";

const GRAVITY = 30;
const DAMPING = 0.9;
const REPULSION_K = 8000;
const MIN_DIST_SQ = 100;
const SPRING_K = 0.05;
const DEFAULT_REST_LENGTH = 80;

export class ForceDirectedStrategy implements SimulationStrategy {
  private graph: GraphSnapshot | null = null;
  private bounds = { width: 1000, height: 600 };
  private restLength: number;

  constructor(bounds?: { width: number; height: number }, restLength = DEFAULT_REST_LENGTH) {
    if (bounds) this.bounds = bounds;
    this.restLength = restLength;
  }

  init(graph: GraphSnapshot): void {
    this.graph = graph;
  }

  step(dt: number): void {
    if (!this.graph) return;
    const { nodes, edges } = this.graph;
    const fx = new Map<NodeId, number>();
    const fy = new Map<NodeId, number>();
    for (const n of nodes) {
      fx.set(n.id, 0);
      fy.set(n.id, GRAVITY);
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = Math.max(dx * dx + dy * dy, MIN_DIST_SQ);
        const dist = Math.sqrt(distSq);
        const force = REPULSION_K / distSq;
        fx.set(a.id, fx.get(a.id)! - (force * dx) / dist);
        fy.set(a.id, fy.get(a.id)! - (force * dy) / dist);
        fx.set(b.id, fx.get(b.id)! + (force * dx) / dist);
        fy.set(b.id, fy.get(b.id)! + (force * dy) / dist);
      }
    }

    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const a = byId.get(edge.a);
      const b = byId.get(edge.b);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const stretch = dist - this.restLength;
      const fxEdge = SPRING_K * stretch * (dx / dist);
      const fyEdge = SPRING_K * stretch * (dy / dist);
      fx.set(a.id, fx.get(a.id)! + fxEdge);
      fy.set(a.id, fy.get(a.id)! + fyEdge);
      fx.set(b.id, fx.get(b.id)! - fxEdge);
      fy.set(b.id, fy.get(b.id)! - fyEdge);
    }

    for (const n of nodes) {
      if (n.fixed) continue;
      n.vx = (n.vx + fx.get(n.id)! * dt) * DAMPING;
      n.vy = (n.vy + fy.get(n.id)! * dt) * DAMPING;
      n.x = Math.max(0, Math.min(this.bounds.width, n.x + n.vx * dt));
      n.y = Math.max(0, Math.min(this.bounds.height, n.y + n.vy * dt));
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
  }

  onDragEnd(nodeId: NodeId): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.fixed = false;
    node.vx = 0;
    node.vy = 0;
  }

  private findNode(id: NodeId): GraphNode | undefined {
    return this.graph?.nodes.find((n) => n.id === id);
  }
}
