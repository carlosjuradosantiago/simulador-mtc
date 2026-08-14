// _shared/logger.ts - Sistema de logging centralizado para Edge Functions
import { getSupabaseClient } from './supabase.ts';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  function_name: string;
  handler?: string;
  method?: string;
  path?: string;
  user_id?: string;
  message: string;
  details?: Record<string, unknown>;
  duration_ms?: number;
  status_code?: number;
  error_message?: string;
  error_stack?: string;
  request_id?: string;
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Crea un logger específico para un handler (con buffer propio, sin estado global).
 */
export function createLogger(functionName: string, handler?: string, requestId?: string) {
  const buffer: LogEntry[] = [];
  const reqId = requestId || generateRequestId();

  const log = (level: LogLevel, message: string, details?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level,
      function_name: functionName,
      handler,
      message,
      details,
      request_id: reqId,
    };
    buffer.push(entry);

    // También imprimir en console para Supabase dashboard
    const prefix = `[${level}] [${functionName}${handler ? '.' + handler : ''}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, details ? JSON.stringify(details) : '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, details ? JSON.stringify(details) : '');
    } else {
      console.log(prefix, message, details ? JSON.stringify(details) : '');
    }
  };

  return {
    debug: (message: string, details?: Record<string, unknown>) => log('DEBUG', message, details),
    info: (message: string, details?: Record<string, unknown>) => log('INFO', message, details),
    warn: (message: string, details?: Record<string, unknown>) => log('WARN', message, details),
    error: (message: string, details?: Record<string, unknown>) => log('ERROR', message, details),
    getBuffer: () => buffer,
    getRequestId: () => reqId,
  };
}

/**
 * Middleware que envuelve un handler para capturar logs automáticamente.
 * Cada invocación tiene su propio buffer (thread-safe para requests concurrentes).
 */
export async function withLogging(
  req: Request,
  path: string,
  handlerName: string,
  handlerFn: () => Promise<Response>
): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const method = req.method;

  const logBuffer: LogEntry[] = [];
  const addLog = (level: LogLevel, message: string, details?: Record<string, unknown>) => {
    logBuffer.push({
      level,
      function_name: 'api',
      handler: handlerName,
      method,
      path,
      message,
      details,
      request_id: requestId,
    });
    const prefix = `[${level}] [api.${handlerName}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, details ? JSON.stringify(details) : '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, details ? JSON.stringify(details) : '');
    } else {
      console.log(prefix, message, details ? JSON.stringify(details) : '');
    }
  };

  addLog('INFO', `${method} ${path} - Inicio`, { requestId });

  let response: Response;
  let statusCode: number;
  let errorMessage: string | undefined;
  let errorStack: string | undefined;

  try {
    response = await handlerFn();
    statusCode = response.status;

    if (statusCode >= 400) {
      addLog(statusCode >= 500 ? 'ERROR' : 'WARN',
        `${method} ${path} - Respuesta ${statusCode}`, { statusCode });
    }
  } catch (err) {
    statusCode = 500;
    errorMessage = err instanceof Error ? err.message : String(err);
    errorStack = err instanceof Error ? err.stack : undefined;

    addLog('ERROR', `${method} ${path} - Excepción no capturada`, {
      error: errorMessage,
      stack: errorStack,
    });

    response = new Response(JSON.stringify({
      type: 'UltraSimple',
      message: 'Error interno del servidor.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
      },
    });
  }

  const durationMs = Date.now() - startTime;

  addLog('INFO', `${method} ${path} - Fin (${durationMs}ms, status: ${statusCode})`, {
    durationMs,
    statusCode,
  });

  // Flush logs a la base de datos (fire-and-forget)
  flushLogs(logBuffer, method, path, durationMs, statusCode, requestId, errorMessage, errorStack)
    .catch((e) => console.error('Error flushing logs:', e));

  return response;
}

/**
 * Escribe logs a la tabla edge_function_logs
 */
async function flushLogs(
  buffer: LogEntry[],
  method: string,
  path: string,
  durationMs: number,
  statusCode: number,
  requestId: string,
  errorMessage?: string,
  errorStack?: string
) {
  if (buffer.length === 0) return;

  try {
    const supabase = getSupabaseClient();

    const rows = buffer.map((entry) => ({
      level: entry.level,
      function_name: entry.function_name,
      handler: entry.handler || null,
      method: entry.method || method,
      path: entry.path || path,
      user_id: entry.user_id || null,
      message: entry.message,
      details: entry.details || null,
      duration_ms: durationMs,
      status_code: statusCode,
      error_message: errorMessage || null,
      error_stack: errorStack || null,
      request_id: entry.request_id || requestId,
    }));

    const { error } = await supabase
      .from('edge_function_logs')
      .insert(rows);

    if (error) {
      console.error('Error guardando logs en BD:', error.message);
    }
  } catch (e) {
    console.error('Excepción al guardar logs:', e);
  }
}

/**
 * Registra un log directo (sin buffer) para operaciones one-shot
 */
export async function logDirect(entry: Omit<LogEntry, 'request_id'>) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('edge_function_logs').insert({
      ...entry,
      details: entry.details || null,
      request_id: crypto.randomUUID(),
    });
  } catch (e) {
    console.error('Error en logDirect:', e);
  }
}
