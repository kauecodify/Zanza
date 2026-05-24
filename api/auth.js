export const config = { runtime: 'edge' };
import { supabase } from '../lib/supabase.js';

export default async function handler(req) {
  const { method } = req;

  if (method === 'POST') {
    const { provider, token, email, password } = await req.json();

    try {
      // Login com Google/Apple via token
      if (provider && token) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: provider,
          token: token,
          nonce: 'zanza-nonce-' + Date.now()
        });
        if (error) throw error;
        return new Response(JSON.stringify({ 
          success: true, 
          user: { 
            id: data.user.id, 
            name: data.user.user_metadata?.name, 
            email: data.user.email,
            avatar: data.user.user_metadata?.avatar_url 
          } 
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      
      // Login email/senha
      if (email && password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return new Response(JSON.stringify({ 
          success: true, 
          user: { 
            id: data.user.id, 
            name: data.user.user_metadata?.name, 
            email: data.user.email 
          } 
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      
      return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // GET: Verificar sessão atual
  if (method === 'GET') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return new Response(JSON.stringify({ 
        success: true, 
        user: { 
          id: session.user.id, 
          name: session.user.user_metadata?.name, 
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url 
        } 
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: false }), { headers: { 'Content-Type': 'application/json' } });
  }

  // POST /logout
  if (method === 'DELETE') {
    await supabase.auth.signOut();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}
