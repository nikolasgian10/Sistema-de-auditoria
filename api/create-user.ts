import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL) {
    return res.status(500).json({ error: 'SUPABASE_URL não configurada' });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, role, minifabrica } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, senha, nome e role obrigatórios' });
    }

    // 🔥 CREATE USER
    const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    });

    const userData = await createUserRes.json();

    if (!createUserRes.ok) {
      return res.status(400).json({ error: userData.error || 'Erro ao criar usuário' });
    }

    const userId = userData.id;

    // 🔥 UPDATE PROFILE
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        name,
        minifabrica: minifabrica || null,
      }),
    });

    // 🔥 INSERT ROLE
    await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        role,
      }),
    });

    return res.status(200).json({
      success: true,
      id: userId,
      email,
      name,
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Erro interno',
    });
  }
}