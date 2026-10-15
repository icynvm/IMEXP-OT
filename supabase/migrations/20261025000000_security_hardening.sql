-- =====================================================================
-- อัปเดต: เพิ่มความปลอดภัย
-- =====================================================================
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--         ต้องรัน 5 ไฟล์ก่อนหน้าแล้ว / รันไฟล์นี้ครั้งเดียว
--
--  1) จำกัดจำนวนครั้ง (rate limit): เดารหัสผ่านผิดซ้ำ ๆ / สมัครถี่ ๆ / ขอลิงก์ลืมรหัสผ่านถี่ ๆ
--     (ทดสอบแล้วว่าเดิมเดารหัสผ่านผิดได้ไม่จำกัด เพราะทุกคนเข้าผ่าน server เดียวกัน Supabase แยก IP ไม่ได้)
--  2) จำกัดโดเมนอีเมลที่สมัครได้ (ไม่บังคับ — ว่าง = สมัครได้ทุกโดเมนเหมือนเดิม)
--     ตรวจในฐานข้อมูล จึงกันได้แม้สมัครผ่าน API ตรงโดยไม่ผ่านหน้าเว็บ
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Rate limit (ใช้จาก server เท่านั้น ผู้ใช้เรียกเองไม่ได้)
-- ---------------------------------------------------------------------
create table public.auth_rate_limits (
  key    text not null,                       -- เช่น "login:ip:1.2.3.4"
  hit_at timestamptz not null default now()
);
create index auth_rate_limits_key_idx on public.auth_rate_limits (key, hit_at);
create index auth_rate_limits_hit_at_idx on public.auth_rate_limits (hit_at);

alter table public.auth_rate_limits enable row level security;  -- ไม่มี policy = ผู้ใช้อ่าน/เขียนไม่ได้เลย
revoke all on public.auth_rate_limits from anon, authenticated;

-- ยังทำได้ไหม: นับครั้งภายในช่วงเวลา ถ้าถึงจำนวนสูงสุดแล้ว = ถูกบล็อก (คืน false)
create function public.rate_limit_allowed(p_key text, p_max int, p_window_seconds int)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select count(*) < p_max
  from public.auth_rate_limits
  where key = p_key and hit_at > now() - make_interval(secs => p_window_seconds);
$fn$;

-- บันทึก 1 ครั้ง (+ ล้างของเก่าเกิน 1 วันทิ้ง ตารางจะได้ไม่โต)
create function public.rate_limit_record(p_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.auth_rate_limits (key) select unnest(p_keys);
  delete from public.auth_rate_limits where hit_at < now() - interval '1 day';
end;
$fn$;

revoke execute on function public.rate_limit_allowed(text, int, int), public.rate_limit_record(text[]) from public, anon, authenticated;
grant execute on function public.rate_limit_allowed(text, int, int), public.rate_limit_record(text[]) to service_role;


-- ---------------------------------------------------------------------
-- 2. โดเมนอีเมลที่สมัครได้
-- ---------------------------------------------------------------------
create table public.signup_settings (
  id                    boolean primary key default true check (id),  -- มีได้แถวเดียว
  allowed_email_domains text[] not null default '{}',                 -- ว่าง = ทุกโดเมน
  updated_at            timestamptz not null default now()
);
insert into public.signup_settings default values;

alter table public.signup_settings enable row level security;
revoke all on public.signup_settings from anon, authenticated;

-- อีเมลนี้สมัครได้ไหม (หน้าสมัครใช้แจ้งข้อความภาษาไทยก่อนส่ง — ฐานข้อมูลตรวจซ้ำตอนสร้างบัญชี)
create function public.signup_email_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select cardinality(s.allowed_email_domains) = 0
      or lower(split_part(p_email, '@', 2)) = any (s.allowed_email_domains)
  from public.signup_settings s;
$fn$;
grant execute on function public.signup_email_allowed(text) to anon, authenticated;

-- admin ดู / ตั้งค่าโดเมน
create function public.admin_get_signup_domains()
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
begin
  if not public.is_admin() then
    raise exception 'เฉพาะ admin เท่านั้น' using errcode = '42501';
  end if;
  return (select allowed_email_domains from public.signup_settings);
end;
$fn$;

create function public.admin_set_signup_domains(p_domains text[])
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
  v_clean text[];
begin
  if not public.is_admin() then
    raise exception 'เฉพาะ admin เท่านั้น' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct d order by d), '{}')
    into v_clean
    from (select lower(trim(both from ltrim(x, '@'))) as d from unnest(coalesce(p_domains, '{}')) as x) t
   where d <> '';
  if exists (select 1 from unnest(v_clean) d where d !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$') then
    raise exception 'รูปแบบโดเมนไม่ถูกต้อง (เช่น company.co.th)' using errcode = '22023';
  end if;
  update public.signup_settings set allowed_email_domains = v_clean, updated_at = now();
end;
$fn$;

revoke execute on function public.admin_get_signup_domains(), public.admin_set_signup_domains(text[]) from public, anon;
grant execute on function public.admin_get_signup_domains(), public.admin_set_signup_domains(text[]) to authenticated;

-- สร้างโปรไฟล์ตอนสมัคร (เหมือนเดิม) + ตรวจโดเมนอีเมล
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if not public.signup_email_allowed(new.email) then
    raise exception 'อีเมลโดเมนนี้สมัครใช้งานไม่ได้' using errcode = '42501';
  end if;

  insert into public.profiles (id, employee_code, first_name, last_name, email)
  values (
    new.id,
    -- ถ้าสร้างผู้ใช้จาก Dashboard โดยไม่มีข้อมูล จะได้ค่าชั่วคราว ให้ admin แก้ทีหลัง
    coalesce(nullif(upper(trim(v_meta ->> 'employee_code')), ''), 'TEMP-' || upper(left(new.id::text, 8))),
    coalesce(nullif(trim(v_meta ->> 'first_name'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(trim(v_meta ->> 'last_name'), ''), '-'),
    lower(new.email)
  );
  return new;
end;
$fn$;
