import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        // Return raw error if supabase fails
        return NextResponse.json({ error: 'Supabase auth error', details: error });
      }
    }

    return NextResponse.redirect(`${origin}/login?error=Ocurrió%20un%20error%20en%20la%20autenticación`);
  } catch (error: any) {
    // Return raw exception to the browser
    return NextResponse.json({ 
      error: 'Unhandled Route Exception', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
