import { getSupabaseClient } from '../_shared/supabase.ts';
import { generateToken, hashPassword, verifyPassword } from '../_shared/auth.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { enviarCodigoRecuperacionContrasena, enviarCodigoVerificacionCorreo } from '../_shared/email.ts';

const AUTH_CODE_PURPOSE = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET'
} as const;

type AuthCodePurpose = (typeof AUTH_CODE_PURPOSE)[keyof typeof AUTH_CODE_PURPOSE];

const AUTH_CODE_TTL_MINUTES = 15;
const MAX_AUTH_CODE_ATTEMPTS = 5;
const FREE_EXAM_LIMIT = 3;

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function displayName(usuario: any) {
  return [usuario.primer_nombre, usuario.apellido].filter(Boolean).join(' ') || usuario.nombre_usuario || 'estudiante';
}

function generateNumericCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + values[0] % 900000);
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashAuthCode(email: string, purpose: AuthCodePurpose, code: string) {
  const secret = Deno.env.get('JWT_SECRET') || 'simulamanejo-auth-code';
  return sha256(`${secret}:${normalizeEmail(email)}:${purpose}:${String(code).trim()}`);
}

async function findCanonicalUsuarioByEmail(supabase: any, email: string) {
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('correo_electronico', normalizeEmail(email))
    .maybeSingle();

  return data;
}

async function createAuthCode(supabase: any, usuario: any, purpose: AuthCodePurpose) {
  const email = normalizeEmail(usuario.correo_electronico);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MINUTES * 60 * 1000).toISOString();
  const code = generateNumericCode();
  const codeHash = await hashAuthCode(email, purpose, code);

  await supabase
    .from('auth_email_codes')
    .update({ consumed_at: now })
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const { error } = await supabase
    .from('auth_email_codes')
    .insert({
      usuario_id: usuario.id,
      email,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      created_at: now
    });

  if (error) {
    console.error('Error creating auth code:', error);
    throw new Error('No se pudo generar el codigo de seguridad');
  }

  return code;
}

async function sendVerificationCode(supabase: any, usuario: any) {
  const code = await createAuthCode(supabase, usuario, AUTH_CODE_PURPOSE.EMAIL_VERIFICATION);
  return enviarCodigoVerificacionCorreo({
    email: normalizeEmail(usuario.correo_electronico),
    nombre: displayName(usuario),
    codigo: code,
    expiraMinutos: AUTH_CODE_TTL_MINUTES
  });
}

async function sendPasswordResetCode(supabase: any, usuario: any) {
  const code = await createAuthCode(supabase, usuario, AUTH_CODE_PURPOSE.PASSWORD_RESET);
  return enviarCodigoRecuperacionContrasena({
    email: normalizeEmail(usuario.correo_electronico),
    nombre: displayName(usuario),
    codigo: code,
    expiraMinutos: AUTH_CODE_TTL_MINUTES
  });
}

async function consumeAuthCode(supabase: any, email: string, purpose: AuthCodePurpose, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const { data: codeRows, error } = await supabase
    .from('auth_email_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error reading auth code:', error);
    return { ok: false, message: 'No se pudo validar el codigo.' };
  }

  const codeRecord = codeRows?.[0];
  if (!codeRecord) {
    return { ok: false, message: 'Codigo invalido o vencido.' };
  }

  if ((codeRecord.attempts ?? 0) >= MAX_AUTH_CODE_ATTEMPTS) {
    await supabase.from('auth_email_codes').update({ consumed_at: now }).eq('id', codeRecord.id);
    return { ok: false, message: 'Codigo bloqueado por demasiados intentos. Solicita uno nuevo.' };
  }

  const expectedHash = await hashAuthCode(normalizedEmail, purpose, code);
  if (expectedHash !== codeRecord.code_hash) {
    await supabase
      .from('auth_email_codes')
      .update({ attempts: (codeRecord.attempts ?? 0) + 1 })
      .eq('id', codeRecord.id);
    return { ok: false, message: 'Codigo incorrecto.' };
  }

  await supabase.from('auth_email_codes').update({ consumed_at: now }).eq('id', codeRecord.id);
  return { ok: true, message: 'Codigo validado.' };
}

async function markUsuarioEmailVerified(supabase: any, usuario: any) {
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('usuarios')
    .update({ correo_verificado: true, esta_verificado: true, actualizado_en: now })
    .eq('id', usuario.id)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('Error verifying usuario email:', error);
    throw new Error('No se pudo verificar el correo');
  }

  await supabase
    .from('users')
    .update({ email_verified: true, updated_at: now })
    .ilike('email', normalizeEmail(usuario.correo_electronico));

  return updated;
}

async function sessionPayload(supabase: any, usuario: any, message: string) {
  const { count: attemptCount } = await supabase
    .from('intento')
    .select('*', { count: 'exact', head: true })
    .eq('id_usuario', usuario.id);

  const token = await generateToken(usuario.nombre_usuario, usuario.id, usuario.correo_electronico);
  return {
    token,
    ...publicUser(usuario, (attemptCount ?? 0) > 0),
    freeExamLimit: FREE_EXAM_LIMIT,
    message
  };
}

async function findLegacyUser(supabase: any, login: string) {
  const normalizedLogin = login.toLowerCase();
  const { data: byUsername } = await supabase
    .from('users')
    .select('*')
    .ilike('username', normalizedLogin)
    .maybeSingle();

  if (byUsername) return byUsername;

  const { data: byEmail } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalizedLogin)
    .maybeSingle();

  return byEmail;
}

async function findCanonicalUsuario(supabase: any, login: string) {
  const normalizedLogin = login.toLowerCase();
  const { data: byUsername } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('nombre_usuario', normalizedLogin)
    .maybeSingle();

  if (byUsername) return byUsername;

  const { data: byEmail } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('correo_electronico', normalizedLogin)
    .maybeSingle();

  return byEmail;
}

async function ensureCanonicalUsuario(supabase: any, legacyUser: any) {
  const { data: existing } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('correo_electronico', legacyUser.email.toLowerCase())
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('usuarios')
    .insert({
      nombre_usuario: legacyUser.username,
      correo_electronico: legacyUser.email,
      primer_nombre: legacyUser.first_name,
      apellido: legacyUser.last_name,
      contrasena: legacyUser.password,
      proveedor_social: legacyUser.social_provider || 'LOCAL',
      id_social: legacyUser.social_id,
      url_foto_social: legacyUser.social_picture_url,
      correo_verificado: legacyUser.email_verified ?? false,
      esta_activo: legacyUser.enabled ?? true,
      habilitado: legacyUser.enabled ?? true,
      creado_en: legacyUser.created_at,
      actualizado_en: legacyUser.updated_at
    })
    .select('*')
    .single();

  if (error || !created) {
    console.error('Error ensuring canonical usuario:', error);
    throw new Error('No se pudo crear el usuario transaccional');
  }

  return created;
}

async function ensureLegacyUser(supabase: any, usuario: any, passwordHash: string) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .ilike('email', usuario.correo_electronico.toLowerCase())
    .maybeSingle();

  if (existing) return existing;

  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from('users')
    .insert({
      username: usuario.nombre_usuario,
      email: usuario.correo_electronico,
      password: passwordHash,
      first_name: usuario.primer_nombre,
      last_name: usuario.apellido,
      social_provider: usuario.proveedor_social || 'LOCAL',
      social_id: usuario.id_social,
      social_picture_url: usuario.url_foto_social,
      enabled: usuario.habilitado ?? usuario.esta_activo ?? true,
      email_verified: usuario.correo_verificado ?? usuario.esta_verificado ?? false,
      created_at: now,
      updated_at: now
    })
    .select('*')
    .single();

  if (error || !created) {
    console.error('Error ensuring legacy user:', error);
    throw new Error('No se pudo crear el usuario de compatibilidad');
  }

  return created;
}

function publicUser(usuario: any, hasExamHistory: boolean) {
  return {
    id: usuario.id,
    username: usuario.nombre_usuario,
    email: usuario.correo_electronico,
    firstName: usuario.primer_nombre,
    lastName: usuario.apellido,
    socialPictureUrl: usuario.url_foto_social,
    emailVerified: usuario.correo_verificado ?? usuario.esta_verificado ?? false,
    hasExamHistory
  };
}

export async function handleLogin(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseClient();

    if (body.loginType?.toUpperCase() !== 'TRADITIONAL') {
      if (['GOOGLE', 'FACEBOOK'].includes(body.loginType?.toUpperCase())) {
        return errorResponse('Login social no implementado aún en edge functions', 501);
      }
      return errorResponse('Tipo de login no soportado: ' + body.loginType);
    }

    if (!body.username || !body.password) {
      return errorResponse('Usuario/email y contraseña son requeridos para login tradicional');
    }

    const usuario = await findCanonicalUsuario(supabase, body.username);
    const legacyUser = await findLegacyUser(supabase, body.username);
    const userForPassword = usuario?.contrasena ? usuario : legacyUser;

    if (!userForPassword) {
      return errorResponse('Usuario o contraseña incorrectos', 401);
    }

    const passwordHash = userForPassword.contrasena ?? userForPassword.password;
    const validPassword = await verifyPassword(body.password, passwordHash);

    if (!validPassword) {
      return errorResponse('Usuario o contraseña incorrectos', 401);
    }

    const canonicalUsuario = usuario ?? await ensureCanonicalUsuario(supabase, legacyUser);
    if (canonicalUsuario.habilitado === false || canonicalUsuario.esta_activo === false) {
      return errorResponse('Usuario deshabilitado', 401);
    }

    const provider = String(canonicalUsuario.proveedor_social || 'LOCAL').toUpperCase();
    if (provider === 'LOCAL' && canonicalUsuario.correo_verificado === false && canonicalUsuario.esta_verificado === false) {
      const emailResult = await sendVerificationCode(supabase, canonicalUsuario).catch((sendError) => {
        console.error('Login verification email error:', sendError);
        return { success: false };
      });

      return jsonResponse({
        error: 'Necesitamos validar tu correo antes de iniciar sesion.',
        requiresEmailVerification: true,
        email: canonicalUsuario.correo_electronico,
        emailSent: emailResult.success === true
      }, 403);
    }

    return jsonResponse(await sessionPayload(supabase, canonicalUsuario, 'Login tradicional exitoso'));
  } catch (err) {
    console.error('Login error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return errorResponse('Error interno: ' + errMsg, 500);
  }
}

export async function handleRegister(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseClient();
    const email = normalizeEmail(body.email);

    if (!body.username || body.username.length < 3) {
      return errorResponse('El nombre de usuario debe tener al menos 3 caracteres');
    }
    if (!email || !email.includes('@')) {
      return errorResponse('Email inválido');
    }
    if (!body.password || body.password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres');
    }

    const existingEmail = await findCanonicalUsuarioByEmail(supabase, email);
    if (existingEmail) {
      if (existingEmail.correo_verificado === false && existingEmail.esta_verificado === false) {
        const emailResult = await sendVerificationCode(supabase, existingEmail).catch((sendError) => {
          console.error('Register resend verification email error:', sendError);
          return { success: false };
        });

        return jsonResponse({
          requiresEmailVerification: true,
          email,
          emailSent: emailResult.success === true,
          freeExamLimit: FREE_EXAM_LIMIT,
          message: emailResult.success === true
            ? 'Ya tenias una cuenta pendiente. Te enviamos un nuevo codigo.'
            : 'Tu cuenta esta pendiente de validacion, pero no pudimos enviar el codigo.'
        });
      }
      return errorResponse('El email ya está en uso');
    }

    const existingUsername = await findCanonicalUsuario(supabase, body.username);
    if (existingUsername) {
      return errorResponse('El nombre de usuario ya está en uso');
    }

    const hashedPassword = await hashPassword(body.password);
    const now = new Date().toISOString();
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert({
        nombre_usuario: body.username,
        correo_electronico: email,
        contrasena: hashedPassword,
        primer_nombre: body.firstName || null,
        apellido: body.lastName || null,
        proveedor_social: 'LOCAL',
        esta_activo: true,
        habilitado: true,
        correo_verificado: false,
        esta_verificado: false,
        creado_en: now,
        actualizado_en: now
      })
      .select('*')
      .single();

    if (error || !usuario) {
      console.error('Error creating usuario:', error);
      return errorResponse('Error al crear usuario', 500);
    }

    await ensureLegacyUser(supabase, usuario, hashedPassword);
    const emailResult = await sendVerificationCode(supabase, usuario).catch((sendError) => {
      console.error('Register verification email error:', sendError);
      return { success: false };
    });

    return jsonResponse({
      requiresEmailVerification: true,
      email,
      userId: usuario.id,
      emailSent: emailResult.success === true,
      freeExamLimit: FREE_EXAM_LIMIT,
      message: emailResult.success === true
        ? 'Registro creado. Te enviamos un codigo para validar tu correo y activar tus 3 simulacros gratis.'
        : 'Registro creado, pero no pudimos enviar el codigo de validacion.'
    }, 201);
  } catch (err) {
    console.error('Register error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

export async function handleVerifyEmail(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').trim();

    if (!email || !email.includes('@') || !code) {
      return errorResponse('Correo y codigo son requeridos');
    }

    const supabase = getSupabaseClient();
    const usuario = await findCanonicalUsuarioByEmail(supabase, email);
    if (!usuario) {
      return errorResponse('No encontramos una cuenta para ese correo', 404);
    }

    const validation = await consumeAuthCode(supabase, email, AUTH_CODE_PURPOSE.EMAIL_VERIFICATION, code);
    if (!validation.ok) {
      return errorResponse(validation.message, 401);
    }

    const verifiedUsuario = await markUsuarioEmailVerified(supabase, usuario);
    return jsonResponse(await sessionPayload(supabase, verifiedUsuario, 'Correo verificado correctamente'));
  } catch (err) {
    console.error('Verify email error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

export async function handleResendVerification(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    if (!email || !email.includes('@')) {
      return errorResponse('Email inválido');
    }

    const supabase = getSupabaseClient();
    const usuario = await findCanonicalUsuarioByEmail(supabase, email);
    if (!usuario) {
      return errorResponse('No encontramos una cuenta para ese correo', 404);
    }

    if (usuario.correo_verificado === true || usuario.esta_verificado === true) {
      return jsonResponse({ message: 'Este correo ya esta verificado.' });
    }

    const emailResult = await sendVerificationCode(supabase, usuario);
    if (!emailResult.success) {
      return errorResponse('No pudimos enviar el codigo de verificacion', 500);
    }

    return jsonResponse({ message: 'Te enviamos un nuevo codigo de verificacion.', email });
  } catch (err) {
    console.error('Resend verification error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

export async function handlePasswordResetRequest(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    if (!email || !email.includes('@')) {
      return errorResponse('Email inválido');
    }

    const supabase = getSupabaseClient();
    const usuario = await findCanonicalUsuarioByEmail(supabase, email);
    if (usuario) {
      const emailResult = await sendPasswordResetCode(supabase, usuario);
      if (!emailResult.success) {
        console.error('Password reset email not sent:', emailResult.error);
      }
    }

    return jsonResponse({ message: 'Si el correo existe, te enviamos un codigo para recuperar tu cuenta.' });
  } catch (err) {
    console.error('Password reset request error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

export async function handlePasswordResetConfirm(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').trim();
    const password = String(body.password || '');

    if (!email || !email.includes('@') || !code) {
      return errorResponse('Correo y codigo son requeridos');
    }
    if (password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres');
    }

    const supabase = getSupabaseClient();
    const usuario = await findCanonicalUsuarioByEmail(supabase, email);
    if (!usuario) {
      return errorResponse('Codigo invalido o vencido', 401);
    }

    const validation = await consumeAuthCode(supabase, email, AUTH_CODE_PURPOSE.PASSWORD_RESET, code);
    if (!validation.ok) {
      return errorResponse(validation.message, 401);
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('usuarios')
      .update({
        contrasena: hashedPassword,
        correo_verificado: true,
        esta_verificado: true,
        actualizado_en: now
      })
      .eq('id', usuario.id);

    if (error) {
      console.error('Password reset update usuario error:', error);
      return errorResponse('No se pudo actualizar la contraseña', 500);
    }

    const { data: legacyUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (legacyUser) {
      await supabase
        .from('users')
        .update({ password: hashedPassword, email_verified: true, updated_at: now })
        .eq('id', legacyUser.id);
    } else {
      await ensureLegacyUser(supabase, { ...usuario, correo_verificado: true, esta_verificado: true }, hashedPassword);
    }

    return jsonResponse({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesion.' });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
