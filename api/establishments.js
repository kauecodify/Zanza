export const config = { runtime: 'edge' };
import { supabase } from '../lib/supabase.js';

export default async function handler(req) {
  console.log('Node version:', process.version);

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

export default async function handler(req) {
  const { method } = req;
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  // GET: Listar com filtro por localização e serviço
  if (method === 'GET') {
    let query = supabase.from('establishments').select('*');
    
    if (params.id) {
      const { data, error } = await query.eq('id', params.id).single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    const { data, error } = await query;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    
    let result = data;
    
    // Filtra por serviço se especificado
    if (params.service) {
      result = result.filter(e => {
        const servicos = typeof e.services === 'string' ? JSON.parse(e.services) : e.services;
        return servicos?.some(s => s.nome?.toLowerCase().includes(params.service.toLowerCase()));
      });
    }
    
    // Calcula distância se tiver coordenadas do usuário
    if (params.lat && params.lng) {
      result = result.map(e => ({
        ...e,
        distance: calcularDistancia(params.lat, params.lng, e.latitude, e.longitude)
      })).sort((a, b) => a.distance - b.distance);
    }
    
    return new Response(JSON.stringify({ success: true, data: result }), { headers: { 'Content-Type': 'application/json' } });
  }

  // POST: Criar novo estabelecimento
  if (method === 'POST') {
    const body = await req.json();
    
    const { data, error } = await supabase.from('establishments').insert([{
      name: body.name,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      phone: body.phone,
      email: body.email,
      description: body.description,
      services: body.services,      // JSON string
      schedules: body.schedules,    // JSON string
      photos: body.photos || [],
      user_id: body.user_id || null,
      verified: false
    }]).select();
    
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true, data: data[0] }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // PUT: Atualizar estabelecimento
  if (method === 'PUT' && params.id) {
    const body = await req.json();
    const { data, error } = await supabase.from('establishments').update(body).eq('id', params.id).select();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true, data: data[0] }), { headers: { 'Content-Type': 'application/json' } });
  }

  // DELETE: Remover estabelecimento
  if (method === 'DELETE' && params.id) {
    const { error } = await supabase.from('establishments').delete().eq('id', params.id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}
