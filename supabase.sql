-- Jalankan seluruh file ini di Supabase > SQL Editor
create table public.profiles(
  id uuid primary key references auth.users on delete cascade,
  username text unique not null, display_name text, bio text default '',
  rank text default 'Anggota',
  role text not null default 'member' check (role in ('owner','coadmin','member')));
create table public.messages(
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text, file_path text, file_name text, created_at timestamptz default now());
create table public.statuses(
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text, file_path text, created_at timestamptz default now());

create function public.new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,username,display_name)
 values(new.id,split_part(new.email,'@',1),split_part(new.email,'@',1)); return new; end $$;
create trigger on_auth_user after insert on auth.users for each row execute function public.new_user();

alter table profiles enable row level security;
alter table messages enable row level security;
alter table statuses enable row level security;
create policy "p read" on profiles for select to authenticated using (true);
create policy "p edit own" on profiles for update to authenticated using (id=auth.uid());
revoke update on profiles from authenticated, anon;
grant update(display_name,bio) on profiles to authenticated;   -- rank & role hanya lewat admin API
create policy "m read" on messages for select to authenticated using (true);
create policy "m add" on messages for insert to authenticated with check (user_id=auth.uid());
create policy "s read" on statuses for select to authenticated using (true);
create policy "s add" on statuses for insert to authenticated with check (user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit) values('files','files',false,10485760);
create policy "f read" on storage.objects for select to authenticated using (bucket_id='files');
create policy "f add" on storage.objects for insert to authenticated with check (bucket_id='files');

alter publication supabase_realtime add table public.messages, public.statuses;
