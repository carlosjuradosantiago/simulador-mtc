export const ADMIN_EMAILS = ['ivan.carlos23@gmail.com'];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email ?? '').trim().toLowerCase());
}

export function isAdminUser(user) {
  return Boolean(user?.isAdmin || isAdminEmail(user?.email));
}
