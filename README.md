# SquadChat — chat, file & status untuk squad (gratis)

## 1. Supabase
1. Buat proyek di supabase.com. Buka **SQL Editor**, tempel isi `supabase.sql`, klik Run.
2. **Authentication > Sign In / Providers > Email**: matikan *Allow new users to sign up* dan matikan *Confirm email*.
3. **Authentication > Users > Add user**: email `usernamemu@squad.chat`, isi sandi, centang Auto Confirm.
4. Di SQL Editor jadikan dirimu owner:
   `update profiles set role='owner', rank='Owner' where username='usernamemu';`
5. **Project Settings > API**: salin Project URL, anon key, dan service_role key.

## 2. Kode
- Buka `public/index.html`, ganti `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di bagian paling atas script.
- Upload folder ini ke repo GitHub.

## 3. Vercel
1. Import repo di vercel.com (Framework: Other, tanpa build command).
2. Environment Variables: `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (JANGAN taruh service_role di index.html).
3. Deploy, lalu login dan tambah akun teman dari tab **Anggota**.
