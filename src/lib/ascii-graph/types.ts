export type NodeId = string;

export type GraphNode = {
  id: NodeId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
};

export type GraphEdge = {
  id: string;
  a: NodeId;
  b: NodeId;
};

export type GraphSnapshot = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type NodePos = { id: NodeId; x: number; y: number };

export interface SimulationStrategy {
  init(graph: GraphSnapshot): void;
  step(dt: number): void;
  onDragStart?(nodeId: NodeId): void;
  onDragMove?(nodeId: NodeId, x: number, y: number): void;
  onDragEnd?(nodeId: NodeId): void;
  destroy?(): void;
}
