/**
 * Agent permission system — who can read, write, deploy.
 */

export type PermissionLevel = "read" | "write" | "deploy" | "admin";

export interface AgentPermissions {
  agent: string;
  read: boolean;
  write: boolean;
  deploy: boolean;
  admin: boolean;
}

export type UserRole = "viewer" | "operator" | "developer" | "admin";

const ROLE_MATRIX: Record<UserRole, PermissionLevel[]> = {
  viewer: ["read"],
  operator: ["read", "write"],
  developer: ["read", "write", "deploy"],
  admin: ["read", "write", "deploy", "admin"],
};

/** Agents that require deploy permission to invoke */
export const DEPLOY_AGENTS = new Set(["SHIP", "FLOW", "NET", "VAULT"]);

/** Agents that require admin for config changes */
export const ADMIN_AGENTS = new Set(["DESK", "FLOW", "SAGE", "ARCH"]);

/** Default role for demo/unauthenticated users */
export const DEFAULT_USER_ROLE: UserRole = "operator";

export function roleHasPermission(role: UserRole, level: PermissionLevel): boolean {
  return ROLE_MATRIX[role].includes(level);
}

export function getPermissionsForRole(role: UserRole, agentName: string): AgentPermissions {
  const agent = agentName.toUpperCase();
  return {
    agent,
    read: roleHasPermission(role, "read"),
    write: roleHasPermission(role, "write"),
    deploy: roleHasPermission(role, "deploy") && !DEPLOY_AGENTS.has(agent) ? true : roleHasPermission(role, "deploy"),
    admin: roleHasPermission(role, "admin") && ADMIN_AGENTS.has(agent) ? roleHasPermission(role, "admin") : roleHasPermission(role, "admin"),
  };
}

export function canInvokeAgent(role: UserRole, agentName: string): { allowed: boolean; reason?: string } {
  const agent = agentName.toUpperCase();
  if (!roleHasPermission(role, "read")) {
    return { allowed: false, reason: "Viewer role required" };
  }
  if (DEPLOY_AGENTS.has(agent) && !roleHasPermission(role, "deploy")) {
    return { allowed: false, reason: `Deploy permission required for ${agent}` };
  }
  return { allowed: true };
}

export function canModifyAgent(role: UserRole, agentName: string): { allowed: boolean; reason?: string } {
  const agent = agentName.toUpperCase();
  if (!roleHasPermission(role, "write")) {
    return { allowed: false, reason: "Write permission required" };
  }
  if (ADMIN_AGENTS.has(agent) && !roleHasPermission(role, "admin")) {
    return { allowed: false, reason: `Admin permission required to modify ${agent}` };
  }
  return { allowed: true };
}

export function getRoleMatrix() {
  return {
    roles: Object.keys(ROLE_MATRIX) as UserRole[],
    matrix: ROLE_MATRIX,
    deployAgents: Array.from(DEPLOY_AGENTS),
    adminAgents: Array.from(ADMIN_AGENTS),
    defaultRole: DEFAULT_USER_ROLE,
  };
}
