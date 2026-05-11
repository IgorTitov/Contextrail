/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the knowledge-graph module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * TypeScript type definitions for the knowledge-graph module.
 * SpecRefs: TPL-114
 */

export interface Entity {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphStorePort {
  addEntities(entities: Entity[]): void;
  addRelationships(relationships: Relationship[]): void;
  getEntities(): Entity[];
  getRelationships(): Relationship[];
  getNeighbors(entityId: string): Entity[];
  traverse(startId: string, maxDepth: number): Entity[];
  clear(): void;
}

export interface EntityExtractorPort {
  extractEntities(text: string): Entity[];
}

export interface RelationshipExtractorPort {
  extractRelationships(text: string, entities: Entity[]): Relationship[];
}

export declare function assertGraphStorePort(adapter: unknown): void;
export declare function assertEntityExtractorPort(adapter: unknown): void;
export declare function assertRelationshipExtractorPort(adapter: unknown): void;
export declare function createMemoryGraphAdapter(): GraphStorePort;
export declare function createRegexEntityExtractor(): EntityExtractorPort;
export declare function createCooccurrenceRelationshipExtractor(): RelationshipExtractorPort;
export declare function bfsTraverse(store: GraphStorePort, startId: string, maxDepth: number): Entity[];
export declare function findConnectedComponents(store: GraphStorePort): Entity[][];
