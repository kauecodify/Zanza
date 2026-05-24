// o login Google já funciona via supabase.auth.signInWithIdToken no frontend
// Este arquivo só seria necessário se quisesse validar tokens no backend
export const config = { runtime: 'edge' };
export default async function handler() {
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}
