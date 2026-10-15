-- =====================================================================
-- อัปเดต: การแจ้งเตือนแบบ Push (เด้งที่มุมจอคอม / แถบแจ้งเตือนมือถือ แม้ปิดหน้าเว็บ)
-- =====================================================================
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--         ต้องรัน 4 ไฟล์ก่อนหน้าแล้ว / รันไฟล์นี้ครั้งเดียว
--
-- push_subscriptions = "ที่อยู่สำหรับส่งการแจ้งเตือน" ของแต่ละอุปกรณ์/เบราว์เซอร์ที่ผู้ใช้กดเปิดแจ้งเตือน
--   1 คนมีได้หลายอุปกรณ์ (คอมที่ทำงาน + มือถือ)
--   ผู้ใช้บันทึก/ลบได้เฉพาะของตัวเองผ่านฟังก์ชัน / server อ่านเพื่อส่งแจ้งเตือน (secret key)
-- =====================================================================

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,          -- ที่อยู่ของบริการ push ของเบราว์เซอร์ (Google / Apple / Mozilla)
  p256dh      text not null,                 -- กุญแจเข้ารหัสข้อความ (จากเบราว์เซอร์)
  auth        text not null,
  user_agent  text,                          -- ไว้ดูว่าเป็นอุปกรณ์อะไร
  created_at  timestamptz not null default now(),
  constraint push_subscriptions_endpoint_https check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  constraint push_subscriptions_keys_len check (char_length(p256dh) <= 200 and char_length(auth) <= 100)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated, service_role;


-- บันทึกอุปกรณ์ของตัวเอง (กดเปิดแจ้งเตือนซ้ำ = อัปเดตของเดิม / เปลี่ยนบัญชีบนเครื่องเดิม = ย้ายมาเป็นของบัญชีใหม่)
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        created_at = now();
end;
$fn$;

-- ปิดแจ้งเตือนบนอุปกรณ์นี้ (ลบได้เฉพาะของตัวเอง)
create function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $fn$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$fn$;

revoke execute on function public.save_push_subscription(text, text, text, text), public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text), public.delete_push_subscription(text) to authenticated;

-- server ลบที่อยู่ที่หมดอายุ (เบราว์เซอร์ถอนสิทธิ์ / ล้างข้อมูล) — เรียกได้เฉพาะ secret key
create function public.remove_expired_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $fn$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$fn$;

revoke execute on function public.remove_expired_push_subscription(text) from public, anon, authenticated;
grant execute on function public.remove_expired_push_subscription(text) to service_role;
