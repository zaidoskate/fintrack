'use server';

/**
 * Server Actions de autenticación.
 * Implementa: Architecture.md §3.1, API_Contract.md §0.
 * Refs: NFR-01 (autenticación segura), agents.md convención de auth.
 *
 * IMPORTANTE: estas acciones usan el cliente de servidor con cookies.
 * Nunca pasan el token al cliente — la sesión vive en cookies HTTP-only.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ── Registro ─────────────────────────────────────────────────────────────────

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName }, // el trigger handle_new_user() lo usa para profiles
    },
  });

  if (error) {
    // Codificamos el error en la URL para que la página lo muestre
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Supabase envía un email de confirmación — redirigir a una página intermedia
  redirect('/signup?message=Revisa+tu+correo+para+confirmar+tu+cuenta');
}

// ── Inicio de sesión ──────────────────────────────────────────────────────────

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const next = (formData.get('next') as string) || '/dashboard';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

// ── Inicio de sesión con OAuth ────────────────────────────────────────────────

export async function signInWithProvider(provider: 'google' | 'apple') {
  const supabase = await createClient();
  
  // Usamos el SITE_URL configurado o un fallback genérico.
  // Es mejor usar headers para obtener el origen real si es posible,
  // pero NEXT_PUBLIC_SITE_URL (o localhost en dev) es el estándar de Supabase.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.url) {
    redirect(data.url);
  }
}

// ── Cierre de sesión ──────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
