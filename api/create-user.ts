import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL) {
    console.error('[CREATE_USER] SUPABASE_URL não configurada');
    return res.status(500).json({ error: 'SUPABASE_URL não configurada' });
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('[CREATE_USER] SUPABASE_SERVICE_ROLE_KEY não configurada');
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' });
  }

  try {
    const { email, password, name, role, minifabrica } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, senha, nome e role obrigatórios' });
    }

    console.log(`[CREATE_USER] Iniciando criação para: ${email}`);

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
    console.log(`[CREATE_USER] Status: ${createUserRes.status}`);

    if (!createUserRes.ok) {
      console.error(`[CREATE_USER] Erro:`, userData);
      return res.status(400).json({ error: userData?.error || userData?.message || 'Erro ao criar usuário' });
    }

    const userId = userData?.id;
    if (!userId) {
      console.error('[CREATE_USER] Sem userId:', userData);
      return res.status(400).json({ error: 'Erro ao criar usuário: ID não retornado' });
    }

    console.log(`[CREATE_USER] Usuário criado: ${userId}`);

    // 🔥 UPDATE PROFILE
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        name,
        minifabrica: minifabrica || null,
      }),
    });

    if (!profileRes.ok) {
      const profileErr = await profileRes.text();
      console.warn(`[CREATE_USER] Aviso perfil (${profileRes.status}):`, profileErr);
    } else {
      console.log(`[CREATE_USER] Perfil atualizado`);
    }

    // 🔥 INSERT ROLE
    const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        role,
      }),
    });

    if (!roleRes.ok) {
      const roleErr = await roleRes.text();
      console.warn(`[CREATE_USER] Aviso role (${roleRes.status}):`, roleErr);
    } else {
      console.log(`[CREATE_USER] Role inserida`);
    }

    console.log(`[CREATE_USER] Sucesso! ${email}`);

    return res.status(200).json({
      success: true,
      id: userId,
      email,
      name,
    });

  } catch (err: any) {
    console.error('[CREATE_USER] Erro:', err);
    return res.status(500).json({
      error: err?.message || 'Erro interno',
    });
  }
}