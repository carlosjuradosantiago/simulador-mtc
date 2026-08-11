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
