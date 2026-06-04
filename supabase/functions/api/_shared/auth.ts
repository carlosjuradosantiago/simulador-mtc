import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { getSupabaseClient } from './supabase.ts';

const JWT_EXPIRATION_SECONDS = 86400; // 24 hours
const PASSWORD_SALT = 'simulador_salt_2024_';

function getJwtSecret() {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

async function getCryptoKey() {
  const secret = getJwtSecret();
  return await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
    name: "HMAC",
    hash: "SHA-256"
  }, false, [
    "sign",
    "verify"
  ]);
}

// Simple JWT implementation for Deno using djwt library
export async function generateToken(username: string, userId: number, email?: string) {
  const key = await getCryptoKey();
  const payload = {
    sub: username,
    userId: userId,
    email,
    iat: getNumericDate(0),
    exp: getNumericDate(JWT_EXPIRATION_SECONDS)
  };
  return await create({
    alg: "HS256",
    typ: "JWT"
  }, payload, key);
}

export async function verifyToken(token: string) {
  try {
    const key = await getCryptoKey();
    const payload = await verify(token, key);
    console.log('Token verified successfully (custom JWT), userId:', payload.userId);
    return payload;
  } catch (err) {
    // Custom JWT verification failed - this is expected for Supabase Auth tokens
    return null;
  }
}

/**
 * Verify a Supabase Auth JWT (access_token from OAuth login like Google)
 * Returns a payload compatible with custom JWT format: { sub, userId }
 */
async function verifySupabaseAuthToken(token: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Supabase Auth token verification failed:', error?.message);
      return null;
    }

    console.log('✅ Supabase Auth token verified, email:', user.email);

    // Look up user in the canonical Spanish users table by email.
    const { data: dbUser, error: dbError } = await supabase
      .from('usuarios')
      .select('id, nombre_usuario, correo_electronico')
      .eq('correo_electronico', user.email)
      .single();

    if (dbError || !dbUser) {
      // User authenticated via OAuth but doesn't exist in our usuarios table yet
      // Auto-create them
      console.log('📝 OAuth user not in usuarios table, creating...', user.email);
      
      const username = user.email?.split('@')[0] || 'user';
      const firstName = user.user_metadata?.given_name || user.user_metadata?.full_name?.split(' ')[0] || '';
      const lastName = user.user_metadata?.family_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
      
      const { data: newUser, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          nombre_usuario: username,
          correo_electronico: user.email,
          primer_nombre: firstName,
          apellido: lastName,
          contrasena: '$oauth$',
          esta_activo: true,
          habilitado: true,
          correo_verificado: true,
          proveedor_social: 'SUPABASE_AUTH',
          id_social: user.id,
          url_foto_social: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        })
        .select('id, nombre_usuario')
        .single();

      if (insertError || !newUser) {
        console.error('❌ Error creating OAuth user in DB:', insertError);
        return null;
      }

      console.log('✅ OAuth user created in DB, id:', newUser.id);
      return {
        sub: newUser.nombre_usuario,
        userId: newUser.id
      };
    }

    console.log('✅ User found in DB, id:', dbUser.id);
    return {
      sub: dbUser.nombre_usuario,
      userId: dbUser.id
    };
  } catch (err) {
    console.error('Supabase auth token verification error:', err);
    return null;
  }
}

// Simple SHA-256 based password hashing (for Edge Functions compatibility)
export async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(PASSWORD_SALT + password + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '$sha256$' + hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, storedHash: string) {
  try {
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      console.log('Bcrypt hash detected, using fallback verification');
      return false;
    }
    if (storedHash.startsWith('$sha256$')) {
      const computed = await hashPassword(password);
      return computed === storedHash;
    }
    return false;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Extract and verify user from request headers.
 * Supports BOTH custom JWT tokens (traditional login) and Supabase Auth tokens (OAuth login).
 * 
 * Flow:
 * 1. Extract token from X-Auth-Token header (primary) or Authorization header (fallback)
 * 2. Try custom JWT verification (djwt with our secret)
 * 3. If that fails, try Supabase Auth verification (supabase.auth.getUser)
 * 4. Return { sub, userId } or null
 */
export async function getUserFromToken(reqOrAuthHeader: Request | string) {
  let token: string | null = null;

  if (reqOrAuthHeader instanceof Request) {
    const req = reqOrAuthHeader;
    // First try X-Auth-Token header (our custom header)
    token = req.headers.get('X-Auth-Token');
    // If not found, try Authorization header as fallback
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  } else if (typeof reqOrAuthHeader === 'string') {
    if (reqOrAuthHeader.startsWith('Bearer ')) {
      token = reqOrAuthHeader.substring(7);
    }
  }

  if (!token) {
    console.log('No token found in request');
    return null;
  }

  // 1. Try custom JWT verification first (fast, no network call)
  const customPayload = await verifyToken(token);
  if (customPayload) {
    return customPayload;
  }

  // 2. Fallback: try Supabase Auth token verification (for OAuth users like Google login)
  console.log('Custom JWT failed, trying Supabase Auth token...');
  const supabasePayload = await verifySupabaseAuthToken(token);
  if (supabasePayload) {
    return supabasePayload;
  }

  console.log('All token verification methods failed');
  return null;
}
