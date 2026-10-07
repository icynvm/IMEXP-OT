-- =====================================================================
-- อัปเดต: วันหยุดนักขัตฤกษ์ (วันหยุดไทย) + ขยายช่วงตารางวันหยุด
-- =====================================================================
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--         ต้องรัน 2 ไฟล์ก่อนหน้าแล้ว / รันไฟล์นี้ครั้งเดียว
--
--  1) ตาราง public_holidays: วันหยุดนักขัตฤกษ์ ทุกคนอ่านได้ / admin เพิ่ม-ลบได้จากหน้าเว็บ
--     ใส่ข้อมูลปี 2569 และ 2570 ให้แล้ว (ตามประกาศวันหยุดธนาคารแห่งประเทศไทย / ภาคเอกชน)
--  2) leave_calendar ดูได้ครั้งละไม่เกิน ~2 ปี (เดิม 2 เดือน) เพื่อให้เปลี่ยนเดือนได้ทันทีไม่ต้องรอโหลด
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ตารางวันหยุด
-- ---------------------------------------------------------------------
create table public.public_holidays (
  holiday_date date primary key,
  name         text not null,
  created_at   timestamptz not null default now(),
  constraint public_holidays_name_len check (char_length(name) between 1 and 200)
);

alter table public.public_holidays enable row level security;
create policy "public_holidays_select" on public.public_holidays for select to authenticated using (true);
revoke all on public.public_holidays from anon, authenticated;
grant select on public.public_holidays to authenticated, service_role;

-- admin เพิ่ม / แก้ชื่อวันหยุด (วันเดียวกันซ้ำ = แก้ชื่อ)
create function public.admin_save_holiday(p_date date, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
begin
  if not public.is_admin() then
    raise exception 'เฉพาะ admin เท่านั้น' using errcode = '42501';
  end if;
  if p_date is null then
    raise exception 'กรุณาเลือกวันที่' using errcode = '22023';
  end if;

  insert into public.public_holidays (holiday_date, name)
  values (p_date, trim(p_name))
  on conflict (holiday_date) do update set name = excluded.name;
end;
$fn$;

create function public.admin_delete_holiday(p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
begin
  if not public.is_admin() then
    raise exception 'เฉพาะ admin เท่านั้น' using errcode = '42501';
  end if;
  delete from public.public_holidays where holiday_date = p_date;
  if not found then
    raise exception 'ไม่พบวันหยุดนี้' using errcode = '22023';
  end if;
end;
$fn$;

revoke execute on function public.admin_save_holiday(date, text), public.admin_delete_holiday(date) from public, anon;
grant execute on function public.admin_save_holiday(date, text), public.admin_delete_holiday(date) to authenticated;


-- ---------------------------------------------------------------------
-- 2. ข้อมูลวันหยุดเริ่มต้น (แก้/ลบ/เพิ่มได้ที่เมนู "วันหยุดนักขัตฤกษ์" ของ admin)
-- ---------------------------------------------------------------------
insert into public.public_holidays (holiday_date, name) values
  -- ปี 2569 (ค.ศ. 2026)
  ('2026-01-01', 'วันขึ้นปีใหม่'),
  ('2026-01-02', 'วันหยุดพิเศษ (เพิ่มเติม)'),
  ('2026-03-03', 'วันมาฆบูชา'),
  ('2026-04-06', 'วันจักรี'),
  ('2026-04-13', 'วันสงกรานต์'),
  ('2026-04-14', 'วันสงกรานต์'),
  ('2026-04-15', 'วันสงกรานต์'),
  ('2026-05-01', 'วันแรงงานแห่งชาติ'),
  ('2026-05-04', 'วันฉัตรมงคล'),
  ('2026-05-31', 'วันวิสาขบูชา'),
  ('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา'),
  ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว'),
  ('2026-07-29', 'วันอาสาฬหบูชา'),
  ('2026-08-12', 'วันแม่แห่งชาติ'),
  ('2026-10-13', 'วันนวมินทรมหาราช'),
  ('2026-10-16', 'วันหยุดพิเศษ (เฉพาะกรุงเทพมหานคร)'),
  ('2026-10-23', 'วันปิยมหาราช'),
  ('2026-12-05', 'วันพ่อแห่งชาติ'),
  ('2026-12-07', 'วันหยุดชดเชยวันพ่อแห่งชาติ'),
  ('2026-12-10', 'วันรัฐธรรมนูญ'),
  ('2026-12-31', 'วันสิ้นปี'),
  -- ปี 2570 (ค.ศ. 2027)
  ('2027-01-01', 'วันขึ้นปีใหม่'),
  ('2027-02-21', 'วันมาฆบูชา'),
  ('2027-02-22', 'วันหยุดชดเชยวันมาฆบูชา'),
  ('2027-04-06', 'วันจักรี'),
  ('2027-04-13', 'วันสงกรานต์'),
  ('2027-04-14', 'วันสงกรานต์'),
  ('2027-04-15', 'วันสงกรานต์'),
  ('2027-05-01', 'วันแรงงานแห่งชาติ'),
  ('2027-05-03', 'วันหยุดชดเชยวันแรงงานแห่งชาติ'),
  ('2027-05-04', 'วันฉัตรมงคล'),
  ('2027-05-20', 'วันวิสาขบูชา'),
  ('2027-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
  ('2027-07-18', 'วันอาสาฬหบูชา'),
  ('2027-07-19', 'วันหยุดชดเชยวันอาสาฬหบูชา'),
  ('2027-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว'),
  ('2027-08-12', 'วันแม่แห่งชาติ'),
  ('2027-10-13', 'วันนวมินทรมหาราช'),
  ('2027-10-23', 'วันปิยมหาราช'),
  ('2027-10-25', 'วันหยุดชดเชยวันปิยมหาราช'),
  ('2027-12-05', 'วันพ่อแห่งชาติ'),
  ('2027-12-06', 'วันหยุดชดเชยวันพ่อแห่งชาติ'),
  ('2027-12-10', 'วันรัฐธรรมนูญ'),
  ('2027-12-31', 'วันสิ้นปี')
on conflict (holiday_date) do nothing;


-- ---------------------------------------------------------------------
-- 3. ตารางวันหยุดพนักงาน: ดูได้ครั้งละไม่เกิน ~2 ปี
-- ---------------------------------------------------------------------
create or replace function public.leave_calendar(p_from date, p_to date)
returns table (
  usage_id        uuid,
  use_date        date,
  employee_id     uuid,
  first_name      text,
  last_name       text,
  department_name text,
  can_view_detail boolean
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    u.id,
    u.use_date,
    p.id,
    p.first_name,
    p.last_name,
    d.name,
    (u.employee_id = auth.uid() or public.can_manage(u.employee_id))
  from public.ot_usages u
  join public.profiles p on p.id = u.employee_id
  left join public.departments d on d.id = p.department_id
  where u.status = 'approved'
    and u.use_date between p_from and p_to
    and p_to - p_from <= 800                        -- ดูได้ครั้งละไม่เกิน ~2 ปี
    and public.current_user_role() is not null      -- ต้อง login และบัญชียังใช้งานอยู่
  order by u.use_date, p.first_name, p.last_name;
$fn$;
