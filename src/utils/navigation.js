const INTERNAL_ORIGIN = 'https://simuladormtc.local';

export function safeInternalPath(value, fallback = '/dashboard') {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return fallback;

  let decoded;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (decoded.startsWith('//') || decoded.includes('\\') || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;

  try {
    const url = new URL(candidate, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function parseAuthFragment(value) {
  const fragment = typeof value === 'string' ? value.trim() : '';
  const match = fragment.match(/^#(login|register)(?:\?(.*))?$/);
  if (!match) return null;

  const params = new URLSearchParams(match[2] || '');
  const keys = [...params.keys()];
  if (keys.some((key) => !['category', 'next'].includes(key)) || new Set(keys).size !== keys.length) return null;

  const categoryValue = params.get('category');
  const category = categoryValue === null ? null : Number(categoryValue);
  if (categoryValue !== null && (!/^\d+$/.test(categoryValue) || !Number.isSafeInteger(category) || category <= 0)) return null;

  return {
    mode: match[1],
    redirectTo: safeInternalPath(params.get('next'), '/dashboard'),
    category,
  };
}
