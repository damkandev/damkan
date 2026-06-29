import type { GraphEdge, NodeId, NodePos } from "./types";

const CELL_W = 8;
const CELL_H = 14;
const DEFAULT_NODE_SIZE = 16;

type Cell = { span: HTMLSpanElement; lastGlyph: string; lastUsedFrame: number };
type EdgeCache = { colA: number; rowA: number; colB: number; rowB: number; cells: string[] };

function pickGlyph(dCol: number, dRow: number): string {
  // dRow scaled by aspect ratio so the bucket reflects visual angle, not grid angle.
  const angle = (Math.atan2(dRow * (CELL_W / CELL_H), dCol) * 180) / Math.PI;
  const a = ((angle % 180) + 180) % 180;
  if (a < 22.5 || a >= 157.5) return "-";
  if (a < 67.5) return "\\";
  if (a < 112.5) return "|";
  return "/";
}

export class AsciiGraphRenderer {
  private pool = new Map<string, Cell>();
  private edgeCache = new Map<string, EdgeCache>();
  private nodeDivs = new Map<NodeId, HTMLDivElement>();
  private frame = 0;
  private nodeSize = DEFAULT_NODE_SIZE;

  constructor(
    private gridEl: HTMLElement,
    private nodesEl: HTMLElement,
  ) {}

  setNodeSize(size: number): void {
    this.nodeSize = size;
    for (const div of this.nodeDivs.values()) {
      div.style.width = `${size}px`;
      div.style.height = `${size}px`;
    }
  }

  render(nodes: NodePos[], edges: GraphEdge[]): void {
    this.frame++;
    const touched = new Set<string>();
    const byId = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      const a = byId.get(edge.a);
      const b = byId.get(edge.b);
      if (!a || !b) continue;

      const colA = Math.round(a.x / CELL_W);
      const rowA = Math.round(a.y / CELL_H);
      const colB = Math.round(b.x / CELL_W);
      const rowB = Math.round(b.y / CELL_H);

      const cached = this.edgeCache.get(edge.id);
      if (cached && cached.colA === colA && cached.rowA === rowA && cached.colB === colB && cached.rowB === rowB) {
        for (const key of cached.cells) touched.add(key);
        continue;
      }

      const steps = Math.max(Math.abs(colB - colA), Math.abs(rowB - rowA), 1);
      const glyph = pickGlyph(colB - colA, rowB - rowA);
      const cells: string[] = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const col = Math.round(colA + (colB - colA) * t);
        const row = Math.round(rowA + (rowB - rowA) * t);
        const key = `${col},${row}`;
        cells.push(key);
        touched.add(key);
        this.touchCell(key, col, row, glyph);
      }

      this.edgeCache.set(edge.id, { colA, rowA, colB, rowB, cells });
    }

    for (const [key, cell] of this.pool) {
      if (!touched.has(key) && cell.lastUsedFrame !== this.frame) {
        if (cell.lastGlyph !== " ") {
          cell.span.textContent = " ";
          cell.lastGlyph = " ";
        }
      }
    }

    const seen = new Set<NodeId>();
    for (const node of nodes) {
      seen.add(node.id);
      let div = this.nodeDivs.get(node.id);
      if (!div) {
        div = document.createElement("div");
        div.className = "ascii-node";
        div.dataset.nodeId = node.id;
        div.style.width = `${this.nodeSize}px`;
        div.style.height = `${this.nodeSize}px`;
        this.nodesEl.appendChild(div);
        this.nodeDivs.set(node.id, div);
      }
      div.style.transform = `translate(${node.x - this.nodeSize / 2}px, ${node.y - this.nodeSize / 2}px)`;
    }
    for (const [id, div] of this.nodeDivs) {
      if (!seen.has(id)) {
        div.remove();
        this.nodeDivs.delete(id);
      }
    }
  }

  private touchCell(key: string, col: number, row: number, glyph: string): void {
    let cell = this.pool.get(key);
    if (!cell) {
      const span = document.createElement("span");
      span.className = "ascii-cell";
      span.style.transform = `translate(${col * CELL_W}px, ${row * CELL_H}px)`;
      this.gridEl.appendChild(span);
      cell = { span, lastGlyph: "", lastUsedFrame: -1 };
      this.pool.set(key, cell);
    }

    const alreadyTouchedThisFrame = cell.lastUsedFrame === this.frame;
    const next = alreadyTouchedThisFrame && cell.lastGlyph !== glyph ? "+" : glyph;
    if (cell.lastGlyph !== next) {
      cell.span.textContent = next;
      cell.lastGlyph = next;
    }
    cell.lastUsedFrame = this.frame;
  }
}
