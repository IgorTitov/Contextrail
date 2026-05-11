/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the permission module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * TypeScript type declarations for the permission module.
 */

export interface PermissionRule {
  role: string;
  action: string;
  resource: string;
  effect: 'allow' | 'deny';
  conditions?: Record<string, any>;
}

export type RoleHierarchyConfig = Record<string, string[]>;

export interface PermissionCheck {
  allowed: boolean;
  rule?: PermissionRule;
  reason?: string;
}

export interface ResourceAction {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface PermissionPort {
  can(action: string, resource: string, conditions?: Record<string, any>): boolean;
  cannot(action: string, resource: string, conditions?: Record<string, any>): boolean;
  grant(rule: PermissionRule): void;
  revoke(action: string, resource: string, role?: string): void;
  getRulesForRole(role: string): PermissionRule[];
  setUser(user: { role: string }): void;
}

export interface RoleHierarchy {
  resolveRoles(role: string): string[];
}

export interface DynamicPermissionAdapter extends PermissionPort {
  prefetch(action: string, resource: string): Promise<void>;
  invalidateCache(): void;
  destroy(): void;
}

export function assertPermissionPort(adapter: unknown): asserts adapter is PermissionPort;
export function createRoleHierarchy(config: RoleHierarchyConfig): RoleHierarchy;
export function matchRule(
  rule: PermissionRule,
  action: string,
  resource: string,
  conditions?: Record<string, any>,
): boolean;

export interface StaticRulesConfig {
  roles?: RoleHierarchyConfig;
  rules: PermissionRule[];
  defaultEffect?: 'allow' | 'deny';
}

export function createStaticRulesAdapter(config: StaticRulesConfig): PermissionPort;

export interface DynamicAdapterOptions {
  checkFn: (user: { role: string }, action: string, resource: string) => Promise<boolean>;
  grantFn?: (rule: PermissionRule) => Promise<void>;
  revokeFn?: (action: string, resource: string, role?: string) => Promise<void>;
  cacheTtl?: number;
  defaultEffect?: 'allow' | 'deny';
}

export function createDynamicPermissionAdapter(options: DynamicAdapterOptions): DynamicPermissionAdapter;
