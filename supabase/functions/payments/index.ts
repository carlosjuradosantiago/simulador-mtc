import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../api/_shared/cors.ts';
import { errorResponse, jsonResponse } from '../api/_shared/response.ts';
import {
  handleCancelCulqiSubscription,
  handleCulqiWebhook,
  handleGetCulqiConfig,
  handleGetCulqiSubscription,
  handleGetHistorialPagos,
  handleGetReceipt,
  handleProcesarPago,
  handleSimularPago,
} from '../api/handlers/pagos.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/payments/, '')
    .replace(/^\/payments/, '') || '/';
  const method = req.method;

  try {
    if (path === '/' || path === '/health') return jsonResponse({ status: 'ok', service: 'payments' });
    const webhook = path.match(/^\/webhook\/culqi\/([A-Za-z0-9_-]{32,128})$/);
    if (webhook && method === 'POST') return handleCulqiWebhook(req, webhook[1]);
    if (path === '/config' && method === 'GET') return handleGetCulqiConfig(req);
    if (path === '/procesar' && method === 'POST') return handleProcesarPago(req);
    if (path === '/suscripcion' && method === 'GET') return handleGetCulqiSubscription(req);
    if (path === '/suscripcion' && method === 'DELETE') return handleCancelCulqiSubscription(req);
    if (path === '/simular' && method === 'POST') return handleSimularPago(req);
    if (path === '/historial' && method === 'GET') return handleGetHistorialPagos(req);
    const receipt = path.match(/^\/comprobantes\/(\d+)$/);
    if (receipt && method === 'GET') return handleGetReceipt(req, receipt[1]);
    return errorResponse('Ruta de pagos no encontrada', 404);
  } catch (error) {
    console.error('[PAYMENTS] Unhandled error', { message: error instanceof Error ? error.message : 'unknown' });
    return errorResponse('Error interno del servicio de pagos', 500);
  }
});
