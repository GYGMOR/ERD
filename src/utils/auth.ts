/**
 * Utility helpers for working with the authenticated user.
 * Reads from localStorage where the JWT payload and user data
 * are stored after a successful local or MSAL login.
 */

import type { UserRole } from '../types/entities';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface TokenPayload {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

/** Return the raw user object stored at login */
export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

/** Decode the JWT and return the payload (no signature verification – client side only) */
export function getTokenPayload(): TokenPayload | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as TokenPayload;
  } catch {
    return null;
  }
}

/** Return the tenant_id from the stored JWT token */
export function getTenantId(): string | null {
  return getTokenPayload()?.tenant_id ?? null;
}

/** Clear stored auth data (logout) */
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// ─── Role-Based Access ────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  manager: 80,
  employee: 50,
  customer: 10,
  client: 10,
};

/** Check if the current user has one of the allowed roles */
export function hasRole(...allowedRoles: UserRole[]): boolean {
  const user = getUser();
  if (!user) return false;
  return allowedRoles.includes(user.role as UserRole);
}

/** Check if the current user's role is at least the given minimum */
export function hasMinRole(minRole: UserRole): boolean {
  const user = getUser();
  if (!user) return false;
  return (ROLE_HIERARCHY[user.role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 999);
}

/** Returns true if current user is internal staff (not a customer) */
export function isInternal(): boolean {
  return hasRole('admin', 'manager', 'employee');
}
