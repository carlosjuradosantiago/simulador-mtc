import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api.js';

const VISITOR_KEY = 'simuladormtc:visitorId';
const SENSITIVE_PARAMS = new Set(['code', 'access_token', 'refresh_token', 'token']);

function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const nextId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(VISITOR_KEY, nextId);
  return nextId;
}

function scrubSearch(search) {
  const params = new URLSearchParams(search);
  SENSITIVE_PARAMS.forEach((key) => params.delete(key));
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
}

export default function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${scrubSearch(location.search)}`;
    api.trackEvent({
      type: 'page_view',
      visitorId: getVisitorId(),
      path,
      title: document.title,
      referrer: document.referrer || null,
    });
  }, [location.pathname, location.search]);

  return null;
}
