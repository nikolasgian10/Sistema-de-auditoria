import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Debug
  if (!SUPABASE_URL) {
    console.error('Missing SUPABASE_URL environment variable');
    return res.status(500).json({ error: 'Variável SUPABASE_URL não configurada' });
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('Missing SERVICE_ROLE_KEY environment variable');
    return res.status(500).json({ error: 'Variável SUPABASE_SERVICE_ROLE_KEY não configurada' });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, role, minifabrica } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, senha, nome e role obrigatórios' });
    }

    // Create user in Supabase Auth
    const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    });

    if (!createUserRes.ok) {
      const error = await createUserRes.json();
      return res.status(400).json({ error: error.message || 'Erro ao criar usuário' });
    }

    const userData = await createUserRes.json();
    const userId = userData.id;

    // Update profile with name and minifabrica
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ name, minifabrica: minifabrica || null }),
    });

    // Insert user role
    await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, role }),
    });

    return res.status(200).json({ success: true, id: userId, email, name });
  } catch (err: any) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao criar usuário' });
  }
}
