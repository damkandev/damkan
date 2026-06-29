import { Bodies, Composite, Constraint, Engine, Body } from "matter-js";
import type { GraphSnapshot, NodeId, SimulationStrategy } from "../types";

const DEFAULT_REST_LENGTH = 80;
const WALL_THICKNESS = 50;
const DRIFT_SPEED = 0.4;
// ponytail: tune these to taste — they trade "floats forever" against "settles down"
const FRICTION_AIR = 0.03; // per-step air damping; 0 = never loses energy (runaway risk)
const WALL_RESTITUTION = 0.6; // energy kept per wall bounce; 1 = perfectly elastic (runaway risk)
const CONSTRAINT_STIFFNESS = 0.3; // how hard an edge pulls its two nodes together
const MAX_SPEED = 6; // hard velocity clamp, safety net against any remaining runaway

export class MatterJsStrategy implements SimulationStrategy {
  private graph: GraphSnapshot | null = null;
  private engine = Engine.create({ gravity: { x: 0, y: 0 } });
  private bodies = new Map<NodeId, Body>();
  private bounds: { width: number; height: number };
  private restLength: number;

  constructor(
    bounds: { width: number; height: number } = { width: 1000, height: 600 },
    restLength = DEFAULT_REST_LENGTH,
  ) {
    this.bounds = bounds;
    this.restLength = restLength;
  }

  init(graph: GraphSnapshot): void {
    this.graph = graph;
    Composite.clear(this.engine.world, false);
    this.bodies.clear();

    for (const n of graph.nodes) {
      const body = Bodies.circle(n.x, n.y, 4, { frictionAir: FRICTION_AIR, restitution: WALL_RESTITUTION });
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * DRIFT_SPEED,
        y: (Math.random() - 0.5) * DRIFT_SPEED,
      });
      this.bodies.set(n.id, body);
      Composite.add(this.engine.world, body);
    }

    for (const e of graph.edges) {
      const bodyA = this.bodies.get(e.a);
      const bodyB = this.bodies.get(e.b);
      if (!bodyA || !bodyB) continue;
      Composite.add(
        this.engine.world,
        Constraint.create({ bodyA, bodyB, length: this.restLength, stiffness: CONSTRAINT_STIFFNESS }),
      );
    }

    const { width, height } = this.bounds;
    Composite.add(this.engine.world, [
      Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width, WALL_THICKNESS, { isStatic: true }),
      Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width, WALL_THICKNESS, { isStatic: true }),
      Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height, { isStatic: true }),
      Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height, { isStatic: true }),
    ]);
  }

  step(dt: number): void {
    Engine.update(this.engine, dt * 1000);
    if (!this.graph) return;
    for (const n of this.graph.nodes) {
      const body = this.bodies.get(n.id);
      if (!body) continue;

      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > MAX_SPEED) {
        Body.setVelocity(body, {
          x: (body.velocity.x / speed) * MAX_SPEED,
          y: (body.velocity.y / speed) * MAX_SPEED,
        });
      }

      n.x = body.position.x;
      n.y = body.position.y;
    }
  }

  onDragStart(nodeId: NodeId): void {
    const body = this.bodies.get(nodeId);
    if (body) Body.setStatic(body, true);
  }

  onDragMove(nodeId: NodeId, x: number, y: number): void {
    const body = this.bodies.get(nodeId);
    if (body) Body.setPosition(body, { x, y });
  }

  onDragEnd(nodeId: NodeId): void {
    const body = this.bodies.get(nodeId);
    if (!body) return;
    Body.setStatic(body, false);
    Body.setVelocity(body, { x: 0, y: 0 });
  }

  destroy(): void {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
