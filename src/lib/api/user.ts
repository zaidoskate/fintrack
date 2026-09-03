import { createClient } from '@/lib/supabase/client';

export async function getShortcutToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('usuarios_config')
    .select('shortcut_token')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching shortcut_token:', error);
    return null;
  }
  
  return data?.shortcut_token || null;
}
