import { forceLink, forceManyBody, forceSimulation, forceY, type SimulationLinkDatum } from "d3-force";
import type { GraphNode, GraphSnapshot, NodeId, SimulationStrategy } from "../types";

export class D3ForceStrategy implements SimulationStrategy {
  private graph: GraphSnapshot | null = null;
  private simulation: ReturnType<typeof forceSimulation<GraphNode>> | null = null;
  private targetY: number;
  private restLength: number;

  constructor(bounds: { width: number; height: number } = { width: 1000, height: 600 }, restLength = 80) {
    this.targetY = bounds.height * 0.6;
    this.restLength = restLength;
  }

  init(graph: GraphSnapshot): void {
    this.graph = graph;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const links: SimulationLinkDatum<GraphNode>[] = graph.edges
      .map((e) => ({ source: byId.get(e.a), target: byId.get(e.b) }))
      .filter((l): l is { source: GraphNode; target: GraphNode } => !!l.source && !!l.target);

    this.simulation = forceSimulation(graph.nodes)
      .force("charge", forceManyBody().strength(-120))
      .force("link", forceLink(links).distance(this.restLength).strength(0.3))
      .force("y", forceY(this.targetY).strength(0.02))
      .stop();
  }

  step(): void {
    this.simulation?.tick();
  }

  onDragStart(nodeId: NodeId): void {
    const node = this.findNode(nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  }

  onDragMove(nodeId: NodeId, x: number, y: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    node.fx = x;
    node.fy = y;
  }

  onDragEnd(nodeId: NodeId): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.fx = null;
    node.fy = null;
  }

  destroy(): void {
    this.simulation?.stop();
  }

  private findNode(id: NodeId): (GraphNode & { fx?: number | null; fy?: number | null }) | undefined {
    return this.graph?.nodes.find((n) => n.id === id);
  }
}
