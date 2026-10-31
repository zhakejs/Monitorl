const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

module.exports = async (req, res) => {
  const fail = (c, m) => res.status(c).json({ error: m });
  try {
    if (req.method !== 'POST') return fail(405, 'POST saja');
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return fail(401, 'Belum login');
    const { data: me } = await sb.from('profiles').select('*').eq('id', user.id).single();
    const b = req.body || {};

    if (b.action === 'cleanup') { // hapus pesan, status, dan file > 24 jam
      const cut = new Date(Date.now() - 864e5).toISOString();
      for (const t of ['messages', 'statuses']) {
        const { data } = await sb.from(t).select('id,file_path').lt('created_at', cut);
        const paths = (data || []).map(x => x.file_path).filter(Boolean);
        if (paths.length) await sb.storage.from('files').remove(paths);
        if (data && data.length) await sb.from(t).delete().in('id', data.map(x => x.id));
      }
      return res.json({ ok: true });
    }

    if (!['owner', 'coadmin'].includes(me.role)) return fail(403, 'Khusus admin');

    if (b.action === 'create_user') {
      const u = String(b.username || '').trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(u)) return fail(400, 'Username 3-20 karakter: huruf kecil, angka, _');
      if (String(b.password || '').length < 8) return fail(400, 'Sandi minimal 8 karakter');
      const { data, error } = await sb.auth.admin.createUser({ email: u + '@squad.chat', password: b.password, email_confirm: true });
      if (error) return fail(400, error.message);
      await sb.from('profiles').update({ display_name: b.display_name || u }).eq('id', data.user.id);
      return res.json({ ok: true });
    }

    const { data: t } = await sb.from('profiles').select('*').eq('id', b.id).single();
    if (!t) return fail(404, 'Akun tidak ditemukan');
    if (t.role === 'owner' && t.id !== me.id) return fail(403, 'Owner tidak bisa diubah');
    if (t.role === 'coadmin' && me.role !== 'owner' && t.id !== me.id) return fail(403, 'Hanya owner yang bisa mengubah co-admin');

    if (b.action === 'delete_user') {
      if (t.id === me.id) return fail(400, 'Tidak bisa menghapus akun sendiri');
      const { error } = await sb.auth.admin.deleteUser(t.id);
      return error ? fail(400, error.message) : res.json({ ok: true });
    }
    if (b.action === 'reset_password') {
      if (String(b.password || '').length < 8) return fail(400, 'Sandi minimal 8 karakter');
      const { error } = await sb.auth.admin.updateUserById(t.id, { password: b.password });
      return error ? fail(400, error.message) : res.json({ ok: true });
    }
    if (b.action === 'set_role') {
      if (me.role !== 'owner') return fail(403, 'Khusus owner');
      if (!['coadmin', 'member'].includes(b.role)) return fail(400, 'Role tidak valid');
      await sb.from('profiles').update({ role: b.role, rank: String(b.rank || '').slice(0, 20) || 'Anggota' }).eq('id', t.id);
      return res.json({ ok: true });
    }
    return fail(400, 'Aksi tidak dikenal');
  } catch (e) { return fail(500, e.message); }
};
