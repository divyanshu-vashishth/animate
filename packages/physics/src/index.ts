import Matter from "matter-js";

export interface PhysicsBodyConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  isStatic?: boolean;
}

export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;

  constructor() {
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    this.world = this.engine.world;
  }

  addBody(config: PhysicsBodyConfig): Matter.Body {
    const body = Matter.Bodies.rectangle(
      config.x,
      config.y,
      config.width,
      config.height,
      { isStatic: config.isStatic ?? false }
    );
    Matter.World.add(this.world, body);
    return body;
  }

  step(delta = 1000 / 60): void {
    Matter.Engine.update(this.engine, delta);
  }

  applyForce(body: Matter.Body, force: { x: number; y: number }): void {
    Matter.Body.applyForce(body, body.position, force);
  }

  destroy(): void {
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
  }
}

export { Matter };
