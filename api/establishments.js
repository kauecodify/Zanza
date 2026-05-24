export const config = { runtime: 'edge' };
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req) {
  const { method } = req;
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  if (method === 'GET') {
    let query = supabase.from('establishments').select('*');
    if (params.id) {
      const { data, error } = await query.eq('id', params.id).single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } });
    }
    const { data, error } = await query;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    
    // Calcula distância se tiver lat/lng
    let result = data;
    if (params.lat && params.lng) {
      const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
      };
      result = data.map(e => ({ ...e, distance: calcularDistancia(params.lat, params.lng, e.latitude, e.longitude) }))
        .filter(e => !params.service || e.services?.some(s => s.nome?.toLowerCase().includes(params.service.toLowerCase())))
        .sort((a,b) => a.distance - b.distance);
    }
    return new Response(JSON.stringify({ success: true, data: result }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await supabase.from('establishments').insert([{
      name: body.name, address: body.address, latitude: body.latitude, longitude: body.longitude,
      phone: body.phone, email: body.email, description: body.description,
      services: body.services, schedules: body.schedules, photos: body.photos || [],
      user_id: body.user_id || null
    }]).select();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true, data: data[0] }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405 });
}
