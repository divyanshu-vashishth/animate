export type EntityId = number;

export interface TransformComponent {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface RenderComponent {
  displayObjectId: string;
  zIndex: number;
}

export interface SpriteAnimationComponent {
  clip: string;
  playing: boolean;
  loop: boolean;
  currentFrame: number;
  elapsed: number;
}

export interface LayerMetaComponent {
  layerId: string;
  locked: boolean;
  visible: boolean;
}

export interface NameComponent {
  name: string;
}

export interface RigComponent {
  rigId: string;
  pose: string;
  boneRotations: Record<string, number>;
}

export interface SelectableComponent {
  selected: boolean;
}

export interface CombatComponent {
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  active: boolean;
}

export type ComponentMap = {
  transform: TransformComponent;
  render: RenderComponent;
  spriteAnimation: SpriteAnimationComponent;
  layerMeta: LayerMetaComponent;
  name: NameComponent;
  rig: RigComponent;
  selectable: SelectableComponent;
  combat: CombatComponent;
};

export type ComponentType = keyof ComponentMap;
