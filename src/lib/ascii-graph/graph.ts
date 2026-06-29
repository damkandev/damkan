import type { GraphEdge, GraphNode, GraphSnapshot, NodeId } from "./types";

export class Graph {
  private nodes = new Map<NodeId, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private nextId = 0;

  addNode(x: number, y: number, id?: NodeId): GraphNode {
    const node: GraphNode = { id: id ?? `n${this.nextId++}`, x, y, vx: 0, vy: 0 };
    this.nodes.set(node.id, node);
    return node;
  }

  removeNode(id: NodeId): void {
    this.nodes.delete(id);
    for (const edge of this.edges.values()) {
      if (edge.a === id || edge.b === id) this.edges.delete(edge.id);
    }
  }

  addEdge(a: NodeId, b: NodeId, id?: string): GraphEdge {
    const edge: GraphEdge = { id: id ?? `e${this.nextId++}`, a, b };
    this.edges.set(edge.id, edge);
    return edge;
  }

  removeEdge(id: string): void {
    this.edges.delete(id);
  }

  getSnapshot(): GraphSnapshot {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()] };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  randomize(count: number, edgeProbability: number, width: number, height: number): void {
    this.clear();
    const ids: NodeId[] = [];
    for (let i = 0; i < count; i++) {
      const node = this.addNode(Math.random() * width, Math.random() * height);
      ids.push(node.id);
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (Math.random() < edgeProbability) this.addEdge(ids[i], ids[j]);
      }
    }
  }
}
