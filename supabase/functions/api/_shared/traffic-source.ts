export function classifyTrafficSource(routeValue: unknown, referrerValue: unknown) {
  try {
    const route = new URL(String(routeValue || '/'), 'https://www.simuladormtc.com');
    const campaignSource = route.searchParams.get('utm_source')?.trim();
    if (campaignSource) return campaignSource.toLowerCase();

    if (!referrerValue) return 'Directo';
    const hostname = new URL(String(referrerValue)).hostname.replace(/^www\./, '').toLowerCase();
    if (/(^|\.)google\./.test(hostname)) return 'Google';
    if (hostname === 'bing.com' || hostname.endsWith('.bing.com')) return 'Bing';
    if (['chatgpt.com', 'chat.openai.com'].includes(hostname)) return 'ChatGPT';
    if (hostname === 'perplexity.ai' || hostname.endsWith('.perplexity.ai')) return 'Perplexity';
    if (hostname === 'gemini.google.com') return 'Gemini';
    if (hostname === 'claude.ai') return 'Claude';
    if (['facebook.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'linkedin.com', 'x.com', 'twitter.com'].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return 'Redes sociales';
    }
    if (hostname.endsWith('simuladormtc.com')) return 'Navegación interna';
    return hostname || 'Directo';
  } catch {
    return referrerValue ? 'Otro sitio' : 'Directo';
  }
}
