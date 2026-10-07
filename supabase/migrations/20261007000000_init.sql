-- =====================================================================
-- ระบบขอ/ใช้ OT  —  โครงสร้างฐานข้อมูลทั้งหมด (รันครั้งเดียวตอนติดตั้ง)
-- =====================================================================
-- วิธีใช้: เปิด Supabase Dashboard > SQL Editor > วางไฟล์นี้ทั้งไฟล์ > Run
--
-- หลักการสำคัญ (อ่านก่อนแก้ไข)
-- 1) ทุกการ "เขียน" ข้อมูล (สร้าง/อนุมัติ/ยกเลิก) ต้องผ่านฟังก์ชันในไฟล์นี้เท่านั้น
--    ผู้ใช้ไม่มีสิทธิ์ insert/update ตารางตรง ๆ  -> กฎธุรกิจทั้งหมดอยู่ที่เดียว
-- 2) การ "อ่าน" ข้อมูลถูกจำกัดด้วย Row Level Security (RLS)
--    - พนักงาน เห็นเฉพาะข้อมูลของตัวเอง
--    - หัวหน้างาน เห็นข้อมูลของลูกทีม (profiles.supervisor_id = หัวหน้า)
--    - admin เห็นทั้งหมด
-- 3) ยอดคงเหลือ OT ไม่ได้ถูกเก็บเป็นตัวเลข แต่ "คำนวณสด" จาก view
--    ot_request_balances  ->  ไม่มีทางที่ยอดจะเพี้ยนจากข้อมูลจริง
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ประเภทข้อมูล (Enum)
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'supervisor', 'employee');

-- ช่วงเวลา OT: ก่อนเริ่มงาน (ก่อน 09:00) หรือ หลังเลิกงาน (หลัง 18:00)
create type public.ot_period as enum ('before_work', 'after_work');

create type public.approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');


-- ---------------------------------------------------------------------
-- 2. ค่าคงที่ของระบบ (แก้ที่นี่ที่เดียวถ้ากฎบริษัทเปลี่ยน)
-- ---------------------------------------------------------------------
-- วันที่ "วันนี้" ตามเวลาประเทศไทย
create function public.today_th()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Bangkok')::date;
$$;


-- ---------------------------------------------------------------------
-- 3. ตาราง
-- ---------------------------------------------------------------------

-- 3.1 ข้อมูลผู้ใช้ (1 แถว ต่อ 1 บัญชี login)
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  employee_code  text not null unique,           -- รหัสพนักงาน
  first_name     text not null,
  last_name      text not null,
  email          text not null unique,
  role           public.user_role not null default 'employee',
  supervisor_id  uuid references public.profiles (id) on delete set null,  -- หัวหน้าที่ดูแล
  is_active      boolean not null default true,  -- false = ปิดการใช้งาน (ลาออก ฯลฯ)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint profiles_supervisor_not_self check (supervisor_id is null or supervisor_id <> id),
  constraint profiles_employee_code_format check (employee_code ~ '^[A-Z0-9_-]{1,30}$'),
  constraint profiles_first_name_len check (char_length(first_name) between 1 and 100),
  constraint profiles_last_name_len check (char_length(last_name) between 1 and 100)
);

create index profiles_supervisor_id_idx on public.profiles (supervisor_id);


-- 3.2 คำขอทำ OT  (= "ได้" ชั่วโมง OT เมื่ออนุมัติแล้ว)
create table public.ot_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.profiles (id) on delete cascade,
  request_date  date not null default public.today_th(),  -- วันที่ยื่นขอ
  work_date     date not null,                            -- วันที่ทำ OT
  period        public.ot_period not null,                -- ก่อน 09:00 / หลัง 18:00
  start_time    time not null,
  end_time      time not null,
  -- จำนวนชั่วโมง คำนวณอัตโนมัติจากเวลาเริ่ม-สิ้นสุด (ห้ามกรอกเอง กันตัวเลขไม่ตรง)
  hours         numeric(5, 2) generated always as (
                  round(extract(epoch from (end_time - start_time)) / 3600, 2)
                ) stored,
  description   text not null,                            -- ทำงานอะไร
  status        public.approval_status not null default 'pending',
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint ot_requests_time_order check (end_time > start_time),
  -- กฎช่วงเวลา: ก่อนงานต้องจบไม่เกิน 09:00 / หลังงานต้องเริ่มตั้งแต่ 18:00
  constraint ot_requests_period_window check (
    (period = 'before_work' and end_time <= time '09:00')
    or (period = 'after_work' and start_time >= time '18:00')
  ),
  -- นับเป็นช่วงละ 30 นาที (เช่น 18:00, 18:30)
  constraint ot_requests_half_hour check (
    extract(minute from start_time) in (0, 30) and extract(second from start_time) = 0
    and extract(minute from end_time) in (0, 30) and extract(second from end_time) = 0
  ),
  constraint ot_requests_description_len check (char_length(description) between 1 and 1000)
);

create index ot_requests_employee_idx on public.ot_requests (employee_id, work_date desc);
create index ot_requests_status_idx on public.ot_requests (status);


-- 3.3 คำขอใช้ OT  (= "ใช้" ชั่วโมง OT ที่สะสมไว้)
create table public.ot_usages (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.profiles (id) on delete cascade,
  request_date  date not null default public.today_th(),  -- วันที่ยื่นขอใช้
  use_date      date not null,                            -- วันที่ต้องการใช้
  hours         numeric(5, 2) not null,                   -- รวมชั่วโมงที่ใช้ (= ผลรวม allocations)
  reason        text,
  status        public.approval_status not null default 'pending',
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint ot_usages_hours_positive check (hours > 0),
  constraint ot_usages_half_hour check (hours * 2 = trunc(hours * 2)),
  constraint ot_usages_reason_len check (reason is null or char_length(reason) <= 1000)
);

create index ot_usages_employee_idx on public.ot_usages (employee_id, use_date desc);
create index ot_usages_status_idx on public.ot_usages (status);


-- 3.4 การตัดชั่วโมง: คำขอใช้ 1 รายการ ตัดจากคำขอ OT ได้หลายรายการ
create table public.ot_usage_allocations (
  usage_id       uuid not null references public.ot_usages (id) on delete cascade,
  ot_request_id  uuid not null references public.ot_requests (id) on delete cascade,
  hours          numeric(5, 2) not null,
  primary key (usage_id, ot_request_id),
  constraint ot_usage_allocations_hours_positive check (hours > 0),
  constraint ot_usage_allocations_half_hour check (hours * 2 = trunc(hours * 2))
);

create index ot_usage_allocations_request_idx on public.ot_usage_allocations (ot_request_id);


-- ---------------------------------------------------------------------
-- 4. อัปเดต updated_at อัตโนมัติ
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger ot_requests_set_updated_at before update on public.ot_requests
  for each row execute function public.set_updated_at();
create trigger ot_usages_set_updated_at before update on public.ot_usages
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5. สร้าง profile อัตโนมัติเมื่อมีคนสมัครสมาชิก
-- ---------------------------------------------------------------------
-- ข้อมูลชื่อ/รหัสพนักงานมาจากหน้าสมัคร (ส่งผ่าน user metadata)
-- บทบาทเริ่มต้นเป็น 'employee' เสมอ (ไม่อ่าน role จาก metadata เพื่อกันการแอบตั้งตัวเองเป็น admin)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
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
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- เมื่อผู้ใช้เปลี่ยนอีเมลใน Auth ให้ profile ตามด้วย (ใช้ส่งอีเมลแจ้งเตือน)
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();


-- ---------------------------------------------------------------------
-- 6. ฟังก์ชันช่วยตรวจสิทธิ์ (ใช้ใน RLS และฟังก์ชันอื่น)
-- ---------------------------------------------------------------------
-- บทบาทของผู้ใช้ที่ login อยู่ (คืน null ถ้าไม่ได้ login หรือถูกปิดการใช้งาน)
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- ผู้ใช้ปัจจุบัน "ดูแล" พนักงาน p_employee_id หรือไม่ (admin = ทุกคน, หัวหน้า = ลูกทีม)
create function public.can_manage(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_user_role()
    when 'admin' then true
    when 'supervisor' then exists (
      select 1 from public.profiles
      where id = p_employee_id and supervisor_id = auth.uid()
    )
    else false
  end;
$$;

-- หัวหน้าของผู้ใช้ปัจจุบัน (ให้พนักงานเห็นชื่อหัวหน้าตัวเองได้)
create function public.my_supervisor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select supervisor_id from public.profiles where id = auth.uid();
$$;

-- ใช้ภายในฟังก์ชันเขียนข้อมูล: ต้อง login และบัญชียังเปิดใช้งาน
create function public.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.current_user_role() is null then
    raise exception 'กรุณาเข้าสู่ระบบ หรือบัญชีถูกปิดการใช้งาน' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;


-- ---------------------------------------------------------------------
-- 7. Views (คำนวณยอด OT)
-- ---------------------------------------------------------------------
-- security_invoker = true  ->  view ใช้สิทธิ์ RLS ของผู้ที่เรียก (ไม่ทะลุสิทธิ์)

-- ยอดคงเหลือ "ต่อคำขอ OT ที่อนุมัติแล้ว"
--   used_hours      = ใช้ไปแล้ว (คำขอใช้ที่อนุมัติแล้ว)
--   reserved_hours  = จองไว้ (คำขอใช้ที่รออนุมัติ)  -> กันการใช้ชั่วโมงซ้ำ
--   remaining_hours = เหลือให้ใช้ได้จริง
create view public.ot_request_balances
with (security_invoker = true)
as
select
  r.id as ot_request_id,
  r.employee_id,
  r.request_date,
  r.work_date,
  r.period,
  r.start_time,
  r.end_time,
  r.description,
  r.hours,
  coalesce(sum(a.hours) filter (where u.status = 'approved'), 0)::numeric(6, 2) as used_hours,
  coalesce(sum(a.hours) filter (where u.status = 'pending'), 0)::numeric(6, 2) as reserved_hours,
  (r.hours - coalesce(sum(a.hours) filter (where u.status in ('approved', 'pending')), 0))::numeric(6, 2)
    as remaining_hours
from public.ot_requests r
left join public.ot_usage_allocations a on a.ot_request_id = r.id
left join public.ot_usages u on u.id = a.usage_id
where r.status = 'approved'
group by r.id;

-- สรุปยอด "ต่อพนักงาน"
create view public.employee_ot_summary
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
  coalesce(sum(b.remaining_hours), 0)::numeric(8, 2) as remaining_hours
from public.profiles p
left join public.ot_request_balances b on b.employee_id = p.id
group by p.id;


-- ---------------------------------------------------------------------
-- 8. Row Level Security (สิทธิ์การอ่าน)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.ot_requests enable row level security;
alter table public.ot_usages enable row level security;
alter table public.ot_usage_allocations enable row level security;

-- อ่าน profile ได้: ตัวเอง / หัวหน้าของตัวเอง / ลูกทีม / admin
create policy "profiles_select"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or id = (select public.my_supervisor_id())
    or public.can_manage(id)
  );

-- อ่านคำขอ OT ได้: เจ้าของ / หัวหน้า / admin
create policy "ot_requests_select"
  on public.ot_requests for select to authenticated
  using (employee_id = (select auth.uid()) or public.can_manage(employee_id));

-- อ่านคำขอใช้ OT ได้: เจ้าของ / หัวหน้า / admin
create policy "ot_usages_select"
  on public.ot_usages for select to authenticated
  using (employee_id = (select auth.uid()) or public.can_manage(employee_id));

-- อ่านรายการตัดชั่วโมงได้ ตามสิทธิ์ของคำขอใช้
create policy "ot_usage_allocations_select"
  on public.ot_usage_allocations for select to authenticated
  using (exists (select 1 from public.ot_usages u where u.id = usage_id));

-- ไม่มี policy สำหรับ insert/update/delete  =>  เขียนตรงไม่ได้ ต้องผ่านฟังก์ชันด้านล่าง
revoke all on public.profiles, public.ot_requests, public.ot_usages, public.ot_usage_allocations
  from anon, authenticated;
revoke all on public.ot_request_balances, public.employee_ot_summary from anon, authenticated;
grant select on public.profiles, public.ot_requests, public.ot_usages, public.ot_usage_allocations
  to authenticated;
grant select on public.ot_request_balances, public.employee_ot_summary to authenticated;
-- service_role (secret key ฝั่ง server) ใช้อ่านอีเมลผู้รับแจ้งเตือน / เช็กรหัสพนักงานซ้ำ
grant select on public.profiles, public.ot_requests, public.ot_usages, public.ot_usage_allocations
  to service_role;


-- ---------------------------------------------------------------------
-- 9. ฟังก์ชันสำหรับพนักงาน: คำขอทำ OT
-- ---------------------------------------------------------------------
create function public.submit_ot_request(
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
as $$
declare
  v_user uuid := public.require_active_user();
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

  insert into public.ot_requests (employee_id, request_date, work_date, period, start_time, end_time, description)
  values (v_user, p_request_date, p_work_date, p_period, p_start_time, p_end_time, trim(p_description))
  returning id into v_id;

  return v_id;
end;
$$;

create function public.cancel_ot_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_active_user();
begin
  update public.ot_requests
     set status = 'cancelled'
   where id = p_id and employee_id = v_user and status = 'pending';

  if not found then
    raise exception 'ยกเลิกได้เฉพาะคำขอของตัวเองที่ยังรออนุมัติ' using errcode = '42501';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 10. ฟังก์ชันสำหรับพนักงาน: คำขอใช้ OT (ตัดชั่วโมง)
-- ---------------------------------------------------------------------
-- p_allocations = [{"ot_request_id": "...", "hours": 1.5}, ...]
-- ระบุว่าจะตัดชั่วโมงจากคำขอ OT รายการไหน รายการละกี่ชั่วโมง
create function public.submit_ot_usage(
  p_use_date    date,
  p_reason      text,
  p_allocations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := public.require_active_user();
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

  insert into public.ot_usages (employee_id, use_date, hours, reason)
  values (v_user, p_use_date, v_total, nullif(trim(coalesce(p_reason, '')), ''))
  returning id into v_id;

  insert into public.ot_usage_allocations (usage_id, ot_request_id, hours)
  select v_id, (x ->> 'ot_request_id')::uuid, (x ->> 'hours')::numeric
  from jsonb_array_elements(p_allocations) as x;

  return v_id;
end;
$$;

create function public.cancel_ot_usage(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_active_user();
begin
  update public.ot_usages
     set status = 'cancelled'
   where id = p_id and employee_id = v_user and status = 'pending';

  if not found then
    raise exception 'ยกเลิกได้เฉพาะคำขอของตัวเองที่ยังรออนุมัติ' using errcode = '42501';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 11. ฟังก์ชันสำหรับหัวหน้างาน / admin: อนุมัติ - ไม่อนุมัติ
-- ---------------------------------------------------------------------
create function public.review_ot_request(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_active_user();
  v_row  public.ot_requests;
begin
  select * into v_row from public.ot_requests where id = p_id for update;

  if not found or not public.can_manage(v_row.employee_id) then
    raise exception 'ไม่มีสิทธิ์พิจารณาคำขอนี้' using errcode = '42501';
  end if;
  if v_row.employee_id = v_user then
    raise exception 'ไม่สามารถอนุมัติคำขอของตัวเองได้' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'คำขอนี้ถูกพิจารณาไปแล้ว' using errcode = '22023';
  end if;

  update public.ot_requests
     set status      = case when p_approve then 'approved' else 'rejected' end::public.approval_status,
         reviewed_by = v_user,
         reviewed_at = now(),
         review_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id;
end;
$$;

create function public.review_ot_usage(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_active_user();
  v_row  public.ot_usages;
begin
  select * into v_row from public.ot_usages where id = p_id for update;

  if not found or not public.can_manage(v_row.employee_id) then
    raise exception 'ไม่มีสิทธิ์พิจารณาคำขอนี้' using errcode = '42501';
  end if;
  if v_row.employee_id = v_user then
    raise exception 'ไม่สามารถอนุมัติคำขอของตัวเองได้' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'คำขอนี้ถูกพิจารณาไปแล้ว' using errcode = '22023';
  end if;

  update public.ot_usages
     set status      = case when p_approve then 'approved' else 'rejected' end::public.approval_status,
         reviewed_by = v_user,
         reviewed_at = now(),
         review_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 12. ฟังก์ชันสำหรับ admin: จัดการผู้ใช้
-- ---------------------------------------------------------------------
create function public.admin_update_user(
  p_user_id       uuid,
  p_first_name    text,
  p_last_name     text,
  p_employee_code text,
  p_role          public.user_role,
  p_supervisor_id uuid,
  p_is_active     boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_active_user();
begin
  if not public.is_admin() then
    raise exception 'เฉพาะ admin เท่านั้น' using errcode = '42501';
  end if;

  -- กัน admin ล็อกตัวเองออกจากระบบ
  if p_user_id = v_user and (p_role <> 'admin' or not p_is_active) then
    raise exception 'ไม่สามารถลดสิทธิ์หรือปิดการใช้งานบัญชีของตัวเองได้' using errcode = '22023';
  end if;

  if p_supervisor_id is not null then
    if p_supervisor_id = p_user_id then
      raise exception 'ไม่สามารถตั้งตัวเองเป็นหัวหน้าได้' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.profiles
      where id = p_supervisor_id and is_active and role in ('supervisor', 'admin')
    ) then
      raise exception 'หัวหน้าที่เลือกต้องมีบทบาทหัวหน้างานหรือ admin และยังใช้งานอยู่' using errcode = '22023';
    end if;
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
         is_active     = p_is_active
   where id = p_user_id;

  if not found then
    raise exception 'ไม่พบผู้ใช้' using errcode = '22023';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 13. สิทธิ์เรียกใช้ฟังก์ชัน
-- ---------------------------------------------------------------------
-- ปิดทุกฟังก์ชันจากสาธารณะก่อน แล้วเปิดเฉพาะที่ผู้ใช้ที่ login ต้องใช้
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.today_th(),
  public.current_user_role(),
  public.is_admin(),
  public.can_manage(uuid),
  public.my_supervisor_id(),
  public.submit_ot_request(date, date, public.ot_period, time, time, text),
  public.cancel_ot_request(uuid),
  public.submit_ot_usage(date, text, jsonb),
  public.cancel_ot_usage(uuid),
  public.review_ot_request(uuid, boolean, text),
  public.review_ot_usage(uuid, boolean, text),
  public.admin_update_user(uuid, text, text, text, public.user_role, uuid, boolean)
to authenticated;

-- ฟังก์ชัน trigger / ภายใน ไม่ต้องให้ใครเรียกตรง
revoke execute on function
  public.handle_new_user(),
  public.handle_user_email_change(),
  public.set_updated_at(),
  public.require_active_user()
from authenticated;
