-- =====================================================================
-- อัปเดต: หน้าโปรไฟล์ (แก้ชื่อ + รูปโปรไฟล์) และแสดงชื่อผู้อนุมัติ
-- =====================================================================
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--         ต้องรัน 3 ไฟล์ก่อนหน้าแล้ว / รันไฟล์นี้ครั้งเดียว
--
--  1) profiles.avatar_path + ที่เก็บรูป (Storage bucket "avatars")
--     อัปโหลดได้เฉพาะโฟลเดอร์ของตัวเอง (avatars/<id ผู้ใช้>/...) / ทุกคนดูรูปได้ (bucket สาธารณะ)
--  2) update_my_profile: ผู้ใช้แก้ชื่อ-นามสกุลของตัวเอง
--     set_my_avatar:     ผู้ใช้ตั้ง/ลบรูปโปรไฟล์ของตัวเอง
--  3) reviewer_name: ชื่อผู้อนุมัติของคำขอ
--     เดิมพนักงานอ่านข้อมูลผู้อนุมัติไม่ได้ (เช่น หัวหน้าแผนก / admin ที่ไม่ใช่หัวหน้าโดยตรง)
--     จึงไม่มีชื่อผู้อนุมัติขึ้น -> ฟังก์ชันนี้คืนเฉพาะ "ชื่อ" ของผู้อนุมัติ ในคำขอที่ผู้เรียกมีสิทธิ์เห็นเท่านั้น
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. รูปโปรไฟล์
-- ---------------------------------------------------------------------
alter table public.profiles add column avatar_path text;

-- รูปแบบ: <id ผู้ใช้>/<ชื่อไฟล์>.webp|jpg|png  (กันการชี้ไปไฟล์ของคนอื่น)
alter table public.profiles add constraint profiles_avatar_path_format
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg|png)$');

-- bucket สาธารณะ: ใครมีลิงก์ก็ดูรูปได้ (ชื่อไฟล์สุ่ม เดาไม่ได้) / จำกัดขนาด 1 MB และเฉพาะไฟล์รูป
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- อัปโหลด / ลบ ได้เฉพาะไฟล์ในโฟลเดอร์ของตัวเอง และบัญชีต้องยังใช้งานอยู่
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_role() is not null
  );

create policy "avatars_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- ---------------------------------------------------------------------
-- 2. ผู้ใช้แก้โปรไฟล์ของตัวเอง
-- ---------------------------------------------------------------------
create function public.update_my_profile(p_first_name text, p_last_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
begin
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
    raise exception 'กรุณากรอกชื่อและนามสกุล' using errcode = '22023';
  end if;

  update public.profiles
     set first_name = trim(p_first_name),
         last_name  = trim(p_last_name)
   where id = v_user;
end;
$fn$;

-- ตั้งรูปใหม่ (หรือ null = ลบรูป) / คืน path รูปเดิม เพื่อให้หน้าเว็บลบไฟล์เก่าทิ้ง
create function public.set_my_avatar(p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
  v_old  text;
begin
  if p_path is not null then
    if split_part(p_path, '/', 1) <> v_user::text then
      raise exception 'ไฟล์รูปไม่ถูกต้อง' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_path) then
      raise exception 'ไม่พบไฟล์รูป กรุณาอัปโหลดใหม่อีกครั้ง' using errcode = '22023';
    end if;
  end if;

  select avatar_path into v_old from public.profiles where id = v_user;
  update public.profiles set avatar_path = p_path where id = v_user;
  return v_old;
end;
$fn$;

revoke execute on function public.update_my_profile(text, text), public.set_my_avatar(text) from public, anon;
grant execute on function public.update_my_profile(text, text), public.set_my_avatar(text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. ชื่อผู้อนุมัติ (ใช้ใน select ได้แบบคอลัมน์: .select("*, reviewer_name"))
-- ---------------------------------------------------------------------
create function public.reviewer_name(r public.ot_requests)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select p.first_name || ' ' || p.last_name
  from public.ot_requests x
  join public.profiles p on p.id = x.reviewed_by
  where x.id = r.id
    and (x.employee_id = auth.uid() or public.can_manage(x.employee_id));  -- เฉพาะคำขอที่มีสิทธิ์เห็น
$fn$;

create function public.reviewer_name(r public.ot_usages)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select p.first_name || ' ' || p.last_name
  from public.ot_usages x
  join public.profiles p on p.id = x.reviewed_by
  where x.id = r.id
    and (x.employee_id = auth.uid() or public.can_manage(x.employee_id));
$fn$;

revoke execute on function public.reviewer_name(public.ot_requests), public.reviewer_name(public.ot_usages) from public, anon;
grant execute on function public.reviewer_name(public.ot_requests), public.reviewer_name(public.ot_usages) to authenticated;
