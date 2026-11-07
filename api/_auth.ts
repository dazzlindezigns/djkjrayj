import type { VercelRequest } from '@vercel/node';

interface AuthCapable {
  auth: { getUser(jwt: string): Promise<{ data: { user: unknown }; error: unknown }> };
}

export async function isSignedIn(supabase: AuthCapable, req: VercelRequest): Promise<boolean> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}
