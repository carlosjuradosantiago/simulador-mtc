export const ADMIN_ROLE = 'ADMIN';

export function isAdminRole(role) {
  return String(role ?? '').trim().toUpperCase() === ADMIN_ROLE;
}

export function isAdminUser(user) {
  return isAdminRole(user?.role);
}