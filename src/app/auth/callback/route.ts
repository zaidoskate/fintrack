import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirigir al URL de "next" limpio para evitar el tracking query string en el navegador
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En caso de error, o si no hay código
  return NextResponse.redirect(`${origin}/login?error=Ocurrió%20un%20error%20en%20la%20autenticación`);
}
