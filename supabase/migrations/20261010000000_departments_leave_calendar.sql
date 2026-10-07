-- =====================================================================
-- อัปเดต: แผนก + หัวหน้าแผนก + หัวหน้าทีมอนุมัติอัตโนมัติ + ตารางวันหยุด
-- =====================================================================
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--         ต้องรันไฟล์ 20261007000000_init.sql มาก่อนแล้ว / รันไฟล์นี้ครั้งเดียว
--
-- สิ่งที่เปลี่ยน
--  1) บทบาทใหม่ "หัวหน้าแผนก" (department_head)
--     บทบาทเดิม "หัวหน้างาน" (supervisor) เรียกในหน้าเว็บว่า "หัวหน้าทีม"
--  2) ตาราง departments (แผนก) — แต่ละแผนกมีหัวหน้าแผนก 1 คน
--     หัวหน้าแผนกเห็น/อนุมัติได้ทุกคนในแผนก (หัวหน้าทีม + ลูกทีม)
--  3) หัวหน้าทีม / หัวหน้าแผนก / admin ยื่นคำขอแล้ว "อนุมัติอัตโนมัติ" ทันที
--  4) ฟังก์ชัน leave_calendar: ทุกคนดูตารางวันหยุด (การใช้ OT ที่อนุมัติแล้ว) ได้
--     แต่รายละเอียดดูได้เฉพาะเจ้าตัว และหัวหน้าที่ดูแลคนนั้น
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. บทบาทใหม่
-- ---------------------------------------------------------------------
-- หมายเหตุ: ค่า enum ใหม่ใช้ใน transaction เดียวกันไม่ได้ จึงเทียบเป็นข้อความ (::text) ในไฟล์นี้
alter type public.user_role add value if not exists 'department_head';


-- ---------------------------------------------------------------------
-- 2. ตารางแผนก
-- ---------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  head_id     uuid references public.profiles (id) on delete set null,  -- หัวหน้าแผนก
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint departments_name_key unique (name),
  constraint departments_head_key unique (head_id),                   -- 1 คนเป็นหัวหน้าได้ 1 แผนก
  constraint departments_name_len check (char_length(name) between 1 and 100)
);

create trigger departments_set_updated_at before update on public.departments
  for each row execute function public.set_updated_at();

-- พนักงานแต่ละคนสังกัดแผนกไหน
alter table public.profiles
  add column department_id uuid references public.departments (id) on delete set null;

create index profiles_department_id_idx on public.profiles (department_id);

-- ทุกคนที่ login อ่านชื่อแผนกได้ (ไม่มีข้อมูลลับ) / เขียนได้ผ่านฟังก์ชัน admin เท่านั้น
alter table public.departments enable row level security;
create policy "departments_select" on public.departments for select to authenticated using (true);
revoke all on public.departments from anon, authenticated;
grant select on public.departments to authenticated, service_role;


-- ---------------------------------------------------------------------
-- 3. สิทธิ์การดูแล (ใช้ใน RLS และการอนุมัติ)
-- ---------------------------------------------------------------------
--   admin          -> ทุกคน
--   หัวหน้าแผนก    -> ทุกคนในแผนกที่ตัวเองเป็นหัวหน้า + คนที่ตั้งตัวเองเป็นหัวหน้าผู้อนุมัติ
--   หัวหน้าทีม     -> ลูกทีม (คนที่ตั้งตัวเองเป็นหัวหน้าผู้อนุมัติ)
create or replace function public.can_manage(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select case public.current_user_role()::text
    when 'admin' then true
    when 'department_head' then exists (
      select 1 from public.profiles t
      where t.id = p_employee_id
        and (
          t.supervisor_id = auth.uid()
          or t.department_id in (select d.id from public.departments d where d.head_id = auth.uid())
        )
    )
    when 'supervisor' then exists (
      select 1 from public.profiles
      where id = p_employee_id and supervisor_id = auth.uid()
    )
    else false
  end;
$fn$;

-- ผู้ใช้ปัจจุบันเป็นหัวหน้า (ทีม/แผนก) หรือ admin หรือไม่ -> คำขอของตัวเองอนุมัติอัตโนมัติ
create function public.is_self_approver()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(public.current_user_role()::text in ('supervisor', 'department_head', 'admin'), false);
$fn$;


-- ---------------------------------------------------------------------
-- 4. ยอดสรุปต่อพนักงาน: เพิ่มคอลัมน์แผนก (ต่อท้าย ไม่กระทบของเดิม)
-- ---------------------------------------------------------------------
create or replace view public.employee_ot_summary
with (security_invoker = true)
as
select
  p.id as employee_id,
  p.employee_code,
  p.first_name,
  p.last_name,
  p.role,
  p.supervisor_id,
  p.is_active,
  coalesce(sum(b.hours), 0)::numeric(8, 2)           as earned_hours,
  coalesce(sum(b.used_hours), 0)::numeric(8, 2)      as used_hours,
  coalesce(sum(b.reserved_hours), 0)::numeric(8, 2)  as reserved_hours,
  coalesce(sum(b.remaining_hours), 0)::numeric(8, 2) as remaining_hours,
  p.department_id
from public.profiles p
left join public.ot_request_balances b on b.employee_id = p.id
group by p.id;


-- ---------------------------------------------------------------------
-- 5. ยื่นคำขอ: หัวหน้าทีม / หัวหน้าแผนก / admin อนุมัติอัตโนมัติ
-- ---------------------------------------------------------------------
create or replace function public.submit_ot_request(
  p_request_date date,
  p_work_date    date,
  p_period       public.ot_period,
  p_start_time   time,
  p_end_time     time,
  p_description  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
  v_auto boolean := public.is_self_approver();
  v_id   uuid;
begin
  if p_request_date is null or p_request_date > public.today_th() then
    raise exception 'วันที่ขอต้องไม่เป็นวันในอนาคต' using errcode = '22023';
  end if;

  -- ล็อกต่อผู้ใช้ กันการกดส่งซ้ำพร้อมกัน
  perform pg_advisory_xact_lock(hashtext('ot_user:' || v_user::text));

  -- ห้ามช่วงเวลาซ้อนกับคำขอเดิม (ที่ยังรออนุมัติหรืออนุมัติแล้ว) ในวันเดียวกัน
  if exists (
    select 1 from public.ot_requests
    where employee_id = v_user
      and work_date = p_work_date
      and status in ('pending', 'approved')
      and start_time < p_end_time
      and end_time > p_start_time
  ) then
    raise exception 'ช่วงเวลานี้ซ้อนกับคำขอ OT เดิมในวันเดียวกัน' using errcode = '23P01';
  end if;

  insert into public.ot_requests (
    employee_id, request_date, work_date, period, start_time, end_time, description,
    status, reviewed_by, reviewed_at, review_note
  )
  values (
    v_user, p_request_date, p_work_date, p_period, p_start_time, p_end_time, trim(p_description),
    case when v_auto then 'approved' else 'pending' end::public.approval_status,
    case when v_auto then v_user end,
    case when v_auto then now() end,
    case when v_auto then 'อนุมัติอัตโนมัติ (หัวหน้ายื่นเอง)' end
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

create or replace function public.submit_ot_usage(
  p_use_date    date,
  p_reason      text,
  p_allocations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user   uuid := public.require_active_user();
  v_auto   boolean := public.is_self_approver();
  v_id     uuid;
  v_total  numeric(6, 2);
  v_item   record;
  v_bal    record;
begin
  if p_use_date is null then
    raise exception 'กรุณาระบุวันที่ต้องการใช้' using errcode = '22023';
  end if;
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) = 0 then
    raise exception 'กรุณาเลือกคำขอ OT ที่จะใช้ชั่วโมงอย่างน้อย 1 รายการ' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('ot_user:' || v_user::text));

  -- ตรวจทีละรายการ
  for v_item in
    select (x ->> 'ot_request_id')::uuid as ot_request_id,
           (x ->> 'hours')::numeric      as hours,
           count(*) over (partition by x ->> 'ot_request_id') as dup
    from jsonb_array_elements(p_allocations) as x
  loop
    if v_item.dup > 1 then
      raise exception 'เลือกคำขอ OT ซ้ำกัน' using errcode = '22023';
    end if;
    if v_item.hours is null or v_item.hours <= 0 or v_item.hours * 2 <> trunc(v_item.hours * 2) then
      raise exception 'จำนวนชั่วโมงต้องมากกว่า 0 และเป็นทีละ 0.5 ชั่วโมง' using errcode = '22023';
    end if;

    select b.* into v_bal
    from public.ot_request_balances b
    where b.ot_request_id = v_item.ot_request_id and b.employee_id = v_user;

    if not found then
      raise exception 'ไม่พบคำขอ OT ที่อนุมัติแล้วของคุณ' using errcode = '22023';
    end if;
    if v_bal.work_date > public.today_th() then
      raise exception 'ใช้ชั่วโมงได้เฉพาะ OT ที่ทำไปแล้ว (วันที่ % ยังไม่ถึง)', v_bal.work_date using errcode = '22023';
    end if;
    if v_item.hours > v_bal.remaining_hours then
      raise exception 'ชั่วโมงไม่พอ: OT วันที่ % เหลือ % ชั่วโมง', v_bal.work_date, v_bal.remaining_hours
        using errcode = '22023';
    end if;
  end loop;

  select sum((x ->> 'hours')::numeric) into v_total from jsonb_array_elements(p_allocations) as x;

  insert into public.ot_usages (employee_id, use_date, hours, reason, status, reviewed_by, reviewed_at, review_note)
  values (
    v_user, p_use_date, v_total, nullif(trim(coalesce(p_reason, '')), ''),
    case when v_auto then 'approved' else 'pending' end::public.approval_status,
    case when v_auto then v_user end,
    case when v_auto then now() end,
    case when v_auto then 'อนุมัติอัตโนมัติ (หัวหน้ายื่นเอง)' end
  )
  returning id into v_id;

  insert into public.ot_usage_allocations (usage_id, ot_request_id, hours)
  select v_id, (x ->> 'ot_request_id')::uuid, (x ->> 'hours')::numeric
  from jsonb_array_elements(p_allocations) as x;

  return v_id;
end;
$fn$;


-- ---------------------------------------------------------------------
-- 6. admin: จัดการผู้ใช้ (เพิ่มแผนก) — แทนฟังก์ชันเดิม
-- ---------------------------------------------------------------------
drop function public.admin_update_user(uuid, text, text, text, public.user_role, uuid, boolean);

create function public.admin_update_user(
  p_user_id       uuid,
  p_first_name    text,
  p_last_name     text,
  p_employee_code text,
  p_role          public.user_role,
  p_supervisor_id uuid,
  p_department_id uuid,
  p_is_active     boolean
)
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

  -- กัน admin ล็อกตัวเองออกจากระบบ
  if p_user_id = v_user and (p_role::text <> 'admin' or not p_is_active) then
    raise exception 'ไม่สามารถลดสิทธิ์หรือปิดการใช้งานบัญชีของตัวเองได้' using errcode = '22023';
  end if;

  if p_supervisor_id is not null then
    if p_supervisor_id = p_user_id then
      raise exception 'ไม่สามารถตั้งตัวเองเป็นหัวหน้าได้' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.profiles
      where id = p_supervisor_id and is_active and role::text in ('supervisor', 'department_head', 'admin')
    ) then
      raise exception 'หัวหน้าที่เลือกต้องเป็นหัวหน้าทีม หัวหน้าแผนก หรือ admin และยังใช้งานอยู่' using errcode = '22023';
    end if;
  end if;

  if p_department_id is not null and not exists (select 1 from public.departments where id = p_department_id) then
    raise exception 'ไม่พบแผนกที่เลือก' using errcode = '22023';
  end if;

  -- คนที่เป็นหัวหน้าของแผนกอยู่ ต้องมีบทบาทหัวหน้าแผนก (หรือถอดออกจากหัวหน้าแผนกก่อน)
  if p_role::text <> 'department_head' and exists (select 1 from public.departments where head_id = p_user_id) then
    raise exception 'ผู้ใช้นี้เป็นหัวหน้าแผนกอยู่ ต้องเปลี่ยนหัวหน้าในหน้าแผนกก่อน' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles
    where employee_code = upper(trim(p_employee_code)) and id <> p_user_id
  ) then
    raise exception 'รหัสพนักงานนี้มีผู้ใช้แล้ว' using errcode = '23505';
  end if;

  update public.profiles
     set first_name    = trim(p_first_name),
         last_name     = trim(p_last_name),
         employee_code = upper(trim(p_employee_code)),
         role          = p_role,
         supervisor_id = p_supervisor_id,
         department_id = p_department_id,
         is_active     = p_is_active
   where id = p_user_id;

  if not found then
    raise exception 'ไม่พบผู้ใช้' using errcode = '22023';
  end if;
end;
$fn$;


-- ---------------------------------------------------------------------
-- 7. admin: จัดการแผนก
-- ---------------------------------------------------------------------
-- p_id = null -> สร้างแผนกใหม่ / มีค่า -> แก้ไขแผนกเดิม
create function public.admin_save_department(p_id uuid, p_name text, p_head_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := public.require_active_user();
  v_id   uuid;
begin
  if not public.is_admin() then
    raise exception 'เฉพาะ admin เท่านั้น' using errcode = '42501';
  end if;

  if p_head_id is not null and not exists (
    select 1 from public.profiles where id = p_head_id and is_active and role::text = 'department_head'
  ) then
    raise exception 'หัวหน้าแผนกต้องมีบทบาท "หัวหน้าแผนก" และยังใช้งานอยู่ (ตั้งบทบาทในหน้าจัดการผู้ใช้ก่อน)'
      using errcode = '22023';
  end if;

  if p_head_id is not null and exists (
    select 1 from public.departments where head_id = p_head_id and id is distinct from p_id
  ) then
    raise exception 'ผู้ใช้นี้เป็นหัวหน้าของแผนกอื่นอยู่แล้ว' using errcode = '23505';
  end if;

  if p_id is null then
    insert into public.departments (name, head_id) values (trim(p_name), p_head_id) returning id into v_id;
  else
    update public.departments set name = trim(p_name), head_id = p_head_id where id = p_id returning id into v_id;
    if v_id is null then
      raise exception 'ไม่พบแผนก' using errcode = '22023';
    end if;
  end if;

  -- หัวหน้าแผนกสังกัดแผนกของตัวเองด้วย
  if p_head_id is not null then
    update public.profiles set department_id = v_id where id = p_head_id;
  end if;

  return v_id;
end;
$fn$;

-- ลบแผนก: สมาชิกจะกลายเป็น "ไม่มีแผนก" (ข้อมูล OT ไม่หาย)
create function public.admin_delete_department(p_id uuid)
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
  delete from public.departments where id = p_id;
  if not found then
    raise exception 'ไม่พบแผนก' using errcode = '22023';
  end if;
end;
$fn$;


-- ---------------------------------------------------------------------
-- 8. ตารางวันหยุด (การใช้ชั่วโมง OT ที่อนุมัติแล้ว)
-- ---------------------------------------------------------------------
-- ทุกคนที่ login เห็น: วันที่ + ชื่อ + แผนก (ไม่เห็นชั่วโมง/เหตุผล)
-- can_view_detail = true เมื่อเป็นของตัวเอง หรือเป็นหัวหน้าที่ดูแลคนนั้น (รายละเอียดอ่านผ่าน RLS ตามปกติ)
create function public.leave_calendar(p_from date, p_to date)
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
    and p_to - p_from <= 62                         -- ดูได้ครั้งละไม่เกิน ~2 เดือน
    and public.current_user_role() is not null      -- ต้อง login และบัญชียังใช้งานอยู่
  order by u.use_date, p.first_name, p.last_name;
$fn$;


-- ---------------------------------------------------------------------
-- 9. สิทธิ์เรียกใช้ฟังก์ชันใหม่
-- ---------------------------------------------------------------------
revoke execute on function
  public.is_self_approver(),
  public.admin_update_user(uuid, text, text, text, public.user_role, uuid, uuid, boolean),
  public.admin_save_department(uuid, text, uuid),
  public.admin_delete_department(uuid),
  public.leave_calendar(date, date)
from public, anon;

grant execute on function
  public.is_self_approver(),
  public.admin_update_user(uuid, text, text, text, public.user_role, uuid, uuid, boolean),
  public.admin_save_department(uuid, text, uuid),
  public.admin_delete_department(uuid),
  public.leave_calendar(date, date)
to authenticated;
