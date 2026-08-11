import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LEARNING_TOPIC, deriveLearningTopic, getLearningTopicById } from '../utils/learningTopics.js';
import { isAdminRole } from '../utils/admin.js';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://wazikdsfacrawhphzltn.supabase.co/functions/v1/api';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://wazikdsfacrawhphzltn.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhemlrZHNmYWNyYXdocGh6bHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTk2OTIsImV4cCI6MjA3NTQzNTY5Mn0.--xoCk-6Xq0qmUYDDuatBTLOl2q1Nxns_85A4xaiDOU';

export const AUTH_TOKEN_KEY = 'simulamanejo:authToken';

const SUPABASE_AUTH_CLIENT_VERSION = 'pkce-v1';

export const supabaseAuth = globalThis.__simulamanejoSupabaseAuthVersion === SUPABASE_AUTH_CLIENT_VERSION
  ? globalThis.__simulamanejoSupabaseAuth
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    persistSession: true,
    storageKey: 'simulamanejo:supabase-auth',
  },
});

globalThis.__simulamanejoSupabaseAuth = supabaseAuth;
globalThis.__simulamanejoSupabaseAuthVersion = SUPABASE_AUTH_CLIENT_VERSION;

const categoryAccent = ['emerald', 'cyan', 'blue', 'orange', 'violet'];
const fallbackCategoryByCode = {
  A1: 25,
  AI: 25,
  'A-I': 25,
  A2A: 16,
  AIIA: 16,
  'A-IIA': 16,
  A2B: 17,
  AIIB: 17,
  'A-IIB': 17,
  A3A: 18,
  AIIIA: 18,
  'A-IIIA': 18,
  A3B: 19,
  AIIIB: 19,
  'A-IIIB': 19,
  A3C: 20,
  AIIIC: 20,
  'A-IIIC': 20,
  B2A: 22,
  BIIA: 22,
  'B-IIA': 22,
  B2B: 23,
  BIIB: 23,
  'B-IIB': 23,
  B2C: 24,
  BIIC: 24,
  'B-IIC': 24,
};

const categoryTitleById = {
  16: 'A-IIA',
  17: 'A-IIB',
  18: 'A-IIIA',
  19: 'A-IIIB',
  20: 'A-IIIC',
  22: 'B-IIA',
  23: 'B-IIB',
  24: 'B-IIC',
  25: 'A-I',
};

export function getStoredToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function apiRequest(path, { method = 'GET', body, token = getStoredToken(), auth = false, headers = {} } = {}) {
  const requestHeaders = { ...headers };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if ((auth || token) && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
    requestHeaders['X-Auth-Token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const requestError = new Error(data?.error || data?.message || `Error HTTP ${response.status}`);
    requestError.status = response.status;
    requestError.data = data;
    throw requestError;
  }

  return data;
}

export async function apiTextRequest(path, { method = 'GET', token = getStoredToken(), auth = false, headers = {} } = {}) {
  const requestHeaders = { ...headers };

  if ((auth || token) && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
    requestHeaders['X-Auth-Token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
  });

  const text = await response.text();

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = JSON.parse(text);
      message = data?.error || data?.message || message;
    } catch {
      if (text) message = text;
    }
    const requestError = new Error(message);
    requestError.status = response.status;
    throw requestError;
  }

  return text;
}

export async function getGoogleOAuthUrl({ redirectTo } = {}) {
  window.localStorage.removeItem('simulamanejo:supabase-auth-code-verifier');

  const { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'email profile',
      queryParams: {
        prompt: 'select_account',
      },
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    throw new Error(error?.message || 'No pudimos iniciar el login con Google.');
  }

  return data.url;
}

export async function exchangeSupabaseOAuthCode(code) {
  const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);
  if (error) {
    if (/code verifier|flow state/i.test(error.message || '')) {
      throw new Error('La sesión de Google expiró o se inició en otra pestaña. Vuelve a intentarlo desde este navegador.');
    }
    throw new Error(error.message || 'No pudimos validar la respuesta de Google.');
  }

  return data?.session?.access_token ?? null;
}

function initialsFromName(name) {
  return (name || 'SM')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function toFrontendUser(user, extra = {}) {
  if (!user) return null;
  const name = [user.firstName ?? user.nombre, user.lastName ?? user.apellido].filter(Boolean).join(' ') || user.username || user.email;
  const email = user.email ?? user.correoElectronico ?? user.correo_electronico ?? '';
  const role = String(user.role ?? user.rol ?? 'USUARIO').toUpperCase();
  return {
    id: user.id,
    username: user.username,
    name,
    email,
    role,
    isAdmin: isAdminRole(role),
    category: extra.category ?? user.category ?? user.categoriaPreferidaId ?? null,
    categoryConfirmed: extra.categoryConfirmed ?? user.categoryConfirmed ?? user.categoriaConfirmada ?? false,
    avatar: user.avatar ?? initialsFromName(name),
    registeredAt: (user.createdAt || user.registeredAt || new Date().toISOString()).slice(0, 10),
    stats: extra.stats ?? user.stats ?? null,
    profileImageUrl: user.profileImageUrl ?? user.socialPictureUrl ?? null,
  };
}

export function resolveCategoryId(category) {
  if (!category) return 25;
  if (!Number.isNaN(Number(category))) return Number(category);
  return fallbackCategoryByCode[String(category).toUpperCase()] ?? 25;
}

function normalizeQuestionSearch(search) {
  return search
    .replace(/\bsenal(es)?\b/gi, 'señal$1')
    .replace(/\bsemaforo(s)?\b/gi, 'semáforo$1')
    .replace(/\btransito\b/gi, 'tránsito')
    .replace(/\bcategoria(s)?\b/gi, 'categoría$1');
}

export function toCategoryCard(category, index = 0) {
  const rawName = category.name ?? category.nombre ?? String(category.id);
  const cleanName = rawName.replace(/^Licencia\s+/i, '').replace(/^BASE\s+/i, 'Base ');
  return {
    id: category.id,
    title: cleanName,
    vehicle: category.description ?? category.descripcion ?? rawName,
    description: category.description ?? category.descripcion ?? '',
    progress: category.progress ?? 0,
    accent: categoryAccent[index % categoryAccent.length],
    name: rawName,
  };
}

export function toPlan(plan, index = 0) {
  const priceInCents = Math.round(Number(plan.price ?? plan.precio ?? 0) * 100);
  const durationMonths = Number(plan.durationMonths ?? plan.duracion_meses ?? 1);
  const rawName = plan.name ?? plan.nombre ?? 'Premium';
  return {
    id: plan.id,
    name: rawName.replace(/^Plan\s+/i, ''),
    subtitle: plan.description ?? plan.descripcion ?? 'Acceso completo',
    price: priceInCents,
    period: durationMonths === 1 ? '/mes' : `/${durationMonths} meses`,
    savings: null,
    discount: 0,
    recommended: index === 0,
    features: (plan.features ?? plan.caracteristicas ?? []).map((feature) => feature.item ?? feature),
    durationMonths,
  };
}

export function toQuestion(question, category = '') {
  const options = [...(question.opciones ?? question.options ?? [])].sort((a, b) => Number(a.orden ?? a.order ?? 0) - Number(b.orden ?? b.order ?? 0));
  const correctOption = options.find((option) => option.esCorrecta || option.isCorrect);
  const difficultyMap = { 1: 'fácil', 2: 'medio', 3: 'difícil' };
  return {
    id: question.id,
    texto: question.texto,
    category: normalizeCategoryName(category),
    tema: question.tema ?? 'General',
    dificultad: difficultyMap[question.dificultad] ?? question.dificultad ?? 'medio',
    numeroPdf: question.numeroPdf ?? question.numero_pdf ?? null,
    tipoSeccion: question.tipoSeccion ?? question.tipo_seccion ?? null,
    clase: question.clase ?? null,
    fundamento: question.fundamento ?? null,
    respuestaCorrecta: correctOption?.texto ?? '',
    explicacion: question.explicacion ?? '',
    opciones: options.map((option) => ({
      id: option.id,
      texto: option.texto,
      esCorrecta: option.esCorrecta ?? option.isCorrect ?? false,
      isCorrect: option.isCorrect ?? option.esCorrecta ?? false,
      orden: option.orden ?? option.order ?? null,
      mediaType: option.mediaType ?? option.tipoMultimedia ?? option.tipo_multimedia ?? 'Text',
      mediaData: option.mediaData ?? option.datosMultimedia ?? option.datos_multimedia ?? null,
    })),
    multimedia: question.multimedia ?? [],
    hasMedia: question.hasMedia ?? (Boolean(question.mediaId) || Boolean(question.multimedia?.length)),
    imagenBase64: question.imagenBase64 ?? question.multimedia?.[0]?.datos ?? question.multimedia?.[0]?.data ?? null,
  };
}

function formatDuration(start, end) {
  if (!start || !end) return '0m 00s';
  const seconds = Math.max(Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000), 0);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}

export function normalizeCategoryName(category) {
  if (category === undefined || category === null) return 'A-I';
  const rawCategory = String(category).replace(/^Licencia\s+/i, '');
  return categoryTitleById[Number(rawCategory)] ?? rawCategory;
}

function normalizeAnswerDetail(answer, index = 0) {
  const sinResponder = Boolean(answer.sinResponder ?? answer.sin_responder);
  const esCorrecta = Boolean(answer.esCorrecta ?? answer.es_correcta);
  const idPregunta = answer.idPregunta ?? answer.id_pregunta ?? answer.questionId;
  const temaOficial = answer.temaOficial ?? answer.tema_oficial ?? answer.tema ?? answer.topic ?? 'General';
  const learningTopic = getLearningTopicById(answer.temaRefuerzoId ?? answer.learningTopicId) ?? deriveLearningTopic({
    ...answer,
    temaOficial,
  });

  return {
    ...answer,
    idPregunta,
    numero: answer.numero ?? answer.number ?? index + 1,
    tema: learningTopic.label,
    temaRefuerzo: learningTopic.label,
    temaRefuerzoId: learningTopic.id,
    temaBusqueda: learningTopic.search,
    temaOficial,
    textoPregunta: answer.textoPregunta ?? answer.preguntaTexto ?? answer.questionText ?? answer.texto ?? '',
    idOpcionSeleccionada: answer.idOpcionSeleccionada ?? answer.id_opcion_seleccionada ?? answer.selectedOptionId ?? null,
    opcionSeleccionadaTexto: answer.opcionSeleccionadaTexto ?? answer.selectedOptionText ?? answer.opcionSeleccionada?.texto ?? null,
    idOpcionCorrecta: answer.idOpcionCorrecta ?? answer.correctOptionId ?? answer.opcionCorrecta?.id ?? null,
    opcionCorrectaTexto: answer.opcionCorrectaTexto ?? answer.correctOptionText ?? answer.opcionCorrecta?.texto ?? null,
    explicacion: answer.explicacion ?? answer.explanation ?? null,
    esCorrecta,
    sinResponder,
  };
}

function buildTopicBreakdown(respuestasDetalle, fallbackPercentage = 0) {
  const topicStats = new Map();

  respuestasDetalle.forEach((answer) => {
    const topicId = answer.temaRefuerzoId || DEFAULT_LEARNING_TOPIC.id;
    const topic = answer.temaRefuerzo || answer.tema || 'General';
    const current = topicStats.get(topicId) ?? { id: topicId, tema: topic, search: answer.temaBusqueda ?? '', total: 0, correctas: 0, incorrectas: 0, sinResponder: 0, temasOficiales: new Set() };
    current.total += 1;
    if (answer.temaOficial) current.temasOficiales.add(answer.temaOficial);
    if (answer.sinResponder) {
      current.sinResponder += 1;
    } else if (answer.esCorrecta) {
      current.correctas += 1;
    } else {
      current.incorrectas += 1;
    }
    topicStats.set(topicId, current);
  });

  const topics = Array.from(topicStats.values()).map((topic) => ({
    ...topic,
    temasOficiales: Array.from(topic.temasOficiales),
    porcentaje: topic.total ? Math.round((topic.correctas / topic.total) * 100) : 0,
  }));

  return topics.length ? topics.sort((left, right) => left.porcentaje - right.porcentaje) : [
    { tema: 'General', total: 0, correctas: 0, incorrectas: 0, sinResponder: 0, porcentaje: Math.round(Number(fallbackPercentage) || 0) },
  ];
}

export function toResult(result) {
  if (!result) return null;
  const categoryName = normalizeCategoryName(result.categoria?.nombre ?? result.category ?? 'Licencia A-I');
  const respuestasDetalle = (result.respuestasDetalle ?? result.respuestas_detalle ?? []).map(normalizeAnswerDetail);
  const unansweredCount = respuestasDetalle.filter((answer) => answer.sinResponder).length;
  const incorrectCount = respuestasDetalle.filter((answer) => answer.esCorrecta === false && !answer.sinResponder).length;
  const correctCount = respuestasDetalle.filter((answer) => answer.esCorrecta === true).length;
  const totalQuestions = result.totalPreguntas ?? result.totalQuestions ?? result.total_preguntas ?? respuestasDetalle.length;
  const reviewQuestions = respuestasDetalle
    .filter((answer) => answer.sinResponder || answer.esCorrecta === false)
    .slice(0, 12)
    .map((answer, index) => ({
      id: `${result.id}-${answer.idPregunta ?? index}`,
      numero: answer.numero ?? index + 1,
      tema: answer.tema ?? 'General',
      estado: answer.sinResponder ? 'Sin responder' : 'Incorrecta',
      pregunta: answer.textoPregunta,
      seleccionada: answer.opcionSeleccionadaTexto,
      correcta: answer.opcionCorrectaTexto,
      explicacion: answer.explicacion,
    }));
  const rawPercentage = result.porcentaje ?? result.accuracyPercentage ?? result.score;
  const porcentaje = rawPercentage !== undefined && rawPercentage !== null
    ? Math.round(Number(rawPercentage))
    : totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const explicitTopics = result.temas ?? result.topicBreakdown ?? result.topic_breakdown ?? [];
  const temasFromAnswers = respuestasDetalle.length ? buildTopicBreakdown(respuestasDetalle, porcentaje) : [];
  const temas = temasFromAnswers.length
    ? temasFromAnswers
    : explicitTopics.length
    ? explicitTopics.map((item) => ({
      id: item.id ?? item.topicId ?? item.temaRefuerzoId ?? null,
      tema: item.tema ?? item.topic ?? 'General',
      search: item.search ?? item.busqueda ?? '',
      total: item.total ?? item.totalQuestions ?? null,
      correctas: item.correctas ?? item.correctAnswers ?? null,
      incorrectas: item.incorrectas ?? item.incorrectAnswers ?? null,
      sinResponder: item.sinResponder ?? item.unansweredQuestions ?? null,
      porcentaje: Math.round(Number(item.porcentaje ?? item.percentage ?? 0)),
    }))
    : buildTopicBreakdown(respuestasDetalle, porcentaje);

  return {
    id: result.id ?? result.attemptId,
    category: categoryName,
    total: totalQuestions,
    correctas: result.respuestasCorrectas ?? result.correctAnswers ?? result.respuestas_correctas ?? correctCount,
    incorrectas: result.respuestasIncorrectas ?? result.incorrectAnswers ?? result.respuestas_incorrectas ?? incorrectCount,
    sinResponder: result.sinResponder ?? result.unansweredQuestions ?? result.sin_responder ?? unansweredCount,
    porcentaje,
    aprobado: result.aprobado ?? result.status === 'APROBADO',
    tiempoUsado: result.tiempoUsado ?? formatDuration(result.fechaInicio ?? result.startTime, result.fechaFin ?? result.endTime),
    precision: `${porcentaje}%`,
    temas,
    reviewQuestions,
    createdAt: result.createdAt ?? result.fechaFin ?? result.endTime,
  };
}

export const api = {
  health: () => apiRequest('/health'),
  login: ({ email, username, password }) => apiRequest('/auth/login', {
    method: 'POST',
    body: { loginType: 'TRADITIONAL', username: username || email, password },
    token: null,
  }),
  register: ({ name, email, password, category }) => {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    return apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
        email,
        password,
        firstName,
        lastName: rest.join(' '),
        category,
      },
      token: null,
    });
  },
  verifyEmail: ({ email, code }) => apiRequest('/auth/verify-email', {
    method: 'POST',
    body: { email, code },
    token: null,
  }),
  resendVerification: ({ email }) => apiRequest('/auth/resend-verification', {
    method: 'POST',
    body: { email },
    token: null,
  }),
  requestPasswordReset: ({ email }) => apiRequest('/auth/password-reset/request', {
    method: 'POST',
    body: { email },
    token: null,
  }),
  confirmPasswordReset: ({ email, code, password }) => apiRequest('/auth/password-reset/confirm', {
    method: 'POST',
    body: { email, code, password },
    token: null,
  }),
  getCategories: () => apiRequest('/categories/tipo-examen/2').then((data) => data.map(toCategoryCard)),
  getPlans: () => apiRequest('/membership-plans').then((data) => data.map(toPlan)),
  getPlan: (planId) => apiRequest(`/membership-plans/${planId}`).then((plan) => toPlan(plan)),
  getQuestionBank: ({ categoryId, categoryLabel, search = '', section = 'Todas', learningTopic = '', page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams({ tipoExamenId: '2', page: String(page), size: String(size) });
    if (categoryId && categoryId !== 'Todas') params.set('categoriaId', String(categoryId));
    if (search) params.set('q', normalizeQuestionSearch(search));
    if (learningTopic) params.set('learningTopic', learningTopic);
    if (section && section !== 'Todas') params.set('tipoSeccion', section);
    return apiRequest(`/question-bank?${params}`).then((data) => ({
      ...data,
      content: (data.content ?? []).map((question) => toQuestion(question, categoryLabel ?? categoryId)),
    }));
  },
  getClasses: () => apiRequest('/classes'),
  updateClassProgress: (classId, payload) => apiRequest(`/classes/${classId}/progress`, { method: 'PUT', body: payload, auth: true }),
  getProfile: () => apiRequest('/user/profile', { auth: true }),
  getStats: (categoryId = null) => apiRequest(`/user/stats${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''}`, { auth: true }),
  getSettings: () => apiRequest('/user/settings', { auth: true }),
  updateSettings: (payload) => apiRequest('/user/settings', { method: 'PUT', body: payload, auth: true }),
  getBillingData: () => apiRequest('/user/billing-data', { auth: true }),
  updateBillingData: (payload) => apiRequest('/user/billing-data', { method: 'PUT', body: payload, auth: true }),
  getExamHistory: ({ page = 0, size = 10, categoryId = null } = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (categoryId) params.set('categoryId', String(categoryId));
    return apiRequest(`/user/exam-history?${params}`, { auth: true });
  },
  getRecentHistory: (limit = 5) => apiRequest(`/user/exam-history/recent?limit=${limit}`, { auth: true }),
  getAttemptDetail: (id) => apiRequest(`/user/exam-history/${id}`, { auth: true }).then(toResult),
  getMemberships: () => apiRequest('/user/memberships', { auth: true }),
  getActiveMembership: () => apiRequest('/user/membership/active', { auth: true }),
  getExamCount: () => apiRequest('/user/exam-count', { auth: true }),
  getPaymentConfig: () => apiRequest('/pagos/config'),
  getPaymentHistory: () => apiRequest('/pagos/historial', { auth: true }),
  processPayment: (payload) => apiRequest('/pagos/procesar', { method: 'POST', body: payload, auth: true }),
  simulatePayment: (planId) => apiRequest('/pagos/simular', {
    method: 'POST',
    body: { plan_id: planId },
    auth: true,
  }),
  startTimedExam: (category) => apiRequest(`/preguntas/examen-cronometrado/tipo-examen/2/categoria/${resolveCategoryId(category)}`, { auth: true }),
  startPractice: (category, questionCount = 5, strategy = 'random') => apiRequest('/practica-temporal/iniciar', {
    method: 'POST',
    body: {
      tipoExamenId: 2,
      categoriaId: resolveCategoryId(category),
      cantidadPreguntas: Math.min(Math.max(Number(questionCount) || 5, 5), 40),
      modoSeleccion: strategy === 'weak' ? 'weak' : 'random',
    },
    auth: true,
  }),
  getPracticeState: (sessionId) => apiRequest(`/practica/estado/${sessionId}`, { auth: true }),
  savePracticeAnswer: (sessionId, questionId, optionId) => apiRequest(`/practica/${sessionId}/respuesta`, {
    method: 'POST',
    body: { id_pregunta: questionId, id_opcion_seleccionada: optionId },
    auth: true,
  }),
  finishPractice: (sessionId, payload) => apiRequest(`/practica/finalizar/${sessionId}`, { method: 'POST', body: payload, auth: true }),
  submitExam: (practiceSessionId, respuestas) => apiRequest('/exams/submit', { method: 'POST', body: { practiceSessionId, respuestas }, auth: true }),
  submitPracticeAnswer: (payload) => apiRequest('/practica/responder', { method: 'POST', body: payload, auth: true }),
  getMedia: (mediaId) => apiRequest(`/practica/media/${mediaId}`),
  getComplaintInfo: () => apiRequest('/libro-reclamaciones/info'),
  submitComplaint: (payload) => apiRequest('/libro-reclamaciones', { method: 'POST', body: payload, token: null }),
  getComplaint: (number) => apiRequest(`/libro-reclamaciones/${number}`, { token: null }),
  trackEvent: (payload) => apiRequest('/analytics/event', { method: 'POST', body: payload }).catch(() => null),
  getAdminOverview: () => apiRequest('/admin/overview', { auth: true }),
  exportAdminReport: (type = 'summary') => apiTextRequest(`/admin/export?type=${encodeURIComponent(type)}`, { auth: true }),
};
