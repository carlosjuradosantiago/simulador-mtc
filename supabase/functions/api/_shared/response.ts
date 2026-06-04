import { corsHeaders } from './cors.ts';
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
export function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({
    error: message
  }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
export function unauthorizedResponse() {
  return errorResponse('No autorizado', 401);
}
export function notFoundResponse(message = 'No encontrado') {
  return errorResponse(message, 404);
}
