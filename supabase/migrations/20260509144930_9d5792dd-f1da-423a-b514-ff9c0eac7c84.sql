
-- Fix mutable search_path
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- Restrict SECURITY DEFINER helpers (only callable from policies / server)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.current_user_roles() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Avatars: replace broad public listing with authenticated read of single objects
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars authenticated read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
