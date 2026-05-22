import type { ComponentMap, ComponentType, EntityId } from "./types.js";

let nextEntityId = 1;

export class World {
  private entities = new Set<EntityId>();
  private stores = new Map<ComponentType, Map<EntityId, ComponentMap[ComponentType]>>();
  private entityToUuid = new Map<EntityId, string>();
  private uuidToEntity = new Map<string, EntityId>();

  createEntity(uuid?: string): EntityId {
    const id = nextEntityId++;
    this.entities.add(id);
    if (uuid) {
      this.entityToUuid.set(id, uuid);
      this.uuidToEntity.set(uuid, id);
    }
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    const uuid = this.entityToUuid.get(id);
    if (uuid) {
      this.entityToUuid.delete(id);
      this.uuidToEntity.delete(uuid);
    }
    for (const store of this.stores.values()) {
      store.delete(id);
    }
  }

  getUuid(id: EntityId): string | undefined {
    return this.entityToUuid.get(id);
  }

  getEntityByUuid(uuid: string): EntityId | undefined {
    return this.uuidToEntity.get(uuid);
  }

  setUuid(id: EntityId, uuid: string): void {
    const old = this.entityToUuid.get(id);
    if (old) this.uuidToEntity.delete(old);
    this.entityToUuid.set(id, uuid);
    this.uuidToEntity.set(uuid, id);
  }

  addComponent<K extends ComponentType>(id: EntityId, type: K, data: ComponentMap[K]): void {
    if (!this.stores.has(type)) {
      this.stores.set(type, new Map());
    }
    this.stores.get(type)!.set(id, data);
  }

  getComponent<K extends ComponentType>(id: EntityId, type: K): ComponentMap[K] | undefined {
    return this.stores.get(type)?.get(id) as ComponentMap[K] | undefined;
  }

  hasComponent(id: EntityId, type: ComponentType): boolean {
    return this.stores.get(type)?.has(id) ?? false;
  }

  removeComponent(id: EntityId, type: ComponentType): void {
    this.stores.get(type)?.delete(id);
  }

  query(...types: ComponentType[]): EntityId[] {
    const result: EntityId[] = [];
    for (const id of this.entities) {
      if (types.every((t) => this.hasComponent(id, t))) {
        result.push(id);
      }
    }
    return result;
  }

  getAllEntities(): EntityId[] {
    return [...this.entities];
  }
}
