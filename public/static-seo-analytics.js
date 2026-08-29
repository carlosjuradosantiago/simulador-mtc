(() => {
    if (location.protocol !== 'https:') return;
    const hostname = location.hostname.toLowerCase();
    const apiBaseUrl = hostname === 'simuladormtc.com' || hostname === 'www.simuladormtc.com'
      ? 'https://wazikdsfacrawhphzltn.supabase.co/functions/v1/api'
      : hostname.endsWith('.vercel.app')
        ? 'https://flrvcaizsjhieuvhqkxh.supabase.co/functions/v1/api'
        : null;
    if (!apiBaseUrl) return;

    const sensitiveParams = new Set(['code', 'access_token', 'refresh_token', 'token']);
    const params = new URLSearchParams(location.search);
    sensitiveParams.forEach((key) => params.delete(key));
    const search = params.toString();
    let referrer = null;
    try {
      const referrerUrl = new URL(document.referrer);
      sensitiveParams.forEach((key) => referrerUrl.searchParams.delete(key));
      referrer = referrerUrl.toString();
    } catch {}
    const visitorKey = 'simuladormtc:visitorId';
    let visitorId;
    try {
      visitorId = localStorage.getItem(visitorKey);
      if (!visitorId) {
        visitorId = typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'visitor-' + Date.now() + '-' + Math.random().toString(16).slice(2);
        localStorage.setItem(visitorKey, visitorId);
      }
    } catch {
      visitorId = 'visitor-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }

    fetch(apiBaseUrl + '/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        type: 'page_view',
        visitorId,
        path: location.pathname + (search ? '?' + search : ''),
        title: document.title,
        referrer,
      }),
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {});
  })();
