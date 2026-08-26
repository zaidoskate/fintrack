import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Página raíz — solo redirige.
 * Si hay sesión → /dashboard. Si no → /login.
 * No renderiza nada: el middleware ya hace esto, pero esta redirección
 * es defensiva para el caso en que alguien llegue directo a /.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');
  redirect('/login');
}
