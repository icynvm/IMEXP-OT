-- =====================================================================
-- ตั้งบทบาท admin / หัวหน้างาน และผูกลูกทีมกับหัวหน้า
-- =====================================================================
-- วิธีใช้:
--   1) ให้ทุกคนในรายการ "สมัครสมาชิก" ที่หน้าเว็บก่อน (ต้องมีบัญชีอยู่แล้ว)
--   2) แก้อีเมลในส่วน "แก้ตรงนี้" ด้านล่าง
--   3) Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--   4) ดูตารางผลลัพธ์ด้านล่างว่าบทบาท/หัวหน้าถูกต้อง
--
-- ปลอดภัย:
--   - ถ้ามีอีเมลไหนไม่พบในระบบ จะหยุดทั้งหมดและไม่เปลี่ยนอะไรเลย
--   - รันซ้ำได้ (ผลลัพธ์เหมือนเดิม)
--   - ไม่ลบผู้ใช้ และไม่แตะข้อมูล OT
--   - ใช้ไฟล์นี้แทนหน้า "จัดการผู้ใช้" ได้ ตอนตั้งค่าครั้งแรกหรือมีคนจำนวนมาก
-- =====================================================================

do $fn$
declare
  -- ===================== แก้ตรงนี้ =====================

  -- ผู้ดูแลระบบ (admin): เห็นและจัดการได้ทุกอย่าง
  v_admins text[] := array[
    'admin@your-company.com'
  ];

  -- หัวหน้างาน: อนุมัติคำขอของลูกทีม
  v_supervisors text[] := array[
    'supervisor1@your-company.com',
    'supervisor2@your-company.com'
  ];

  -- ผูกลูกทีมกับหัวหน้า: แต่ละบรรทัดคือ array['อีเมลลูกทีม', 'อีเมลหัวหน้า']
  -- ถ้ายังไม่ต้องการผูก ให้เหลือไว้แค่  v_teams text[][] := '{}';
  v_teams text[][] := array[
    array['employee1@your-company.com', 'supervisor1@your-company.com'],
    array['employee2@your-company.com', 'supervisor1@your-company.com'],
    array['employee3@your-company.com', 'supervisor2@your-company.com']
  ];

  -- =====================================================
  v_missing text;
  v_conflict text;
  i int;
begin
  -- 1) ตรวจว่าทุกอีเมลมีบัญชีในระบบ
  select string_agg(distinct e, ', ') into v_missing
  from (
    select lower(trim(x)) as e from unnest(v_admins || v_supervisors) as x
    union all
    select lower(trim(x)) from unnest(coalesce(v_teams, '{}')) as x
  ) all_emails
  where not exists (select 1 from public.profiles p where p.email = all_emails.e);

  if v_missing is not null then
    raise exception 'ไม่พบบัญชีของอีเมล: % — ให้สมัครสมาชิกที่หน้าเว็บก่อน แล้วรันใหม่ (ยังไม่มีอะไรถูกเปลี่ยน)', v_missing;
  end if;

  -- 2) อีเมลเดียวกันห้ามอยู่ทั้งในรายการ admin และหัวหน้างาน
  select string_agg(lower(trim(a)), ', ') into v_conflict
  from unnest(v_admins) a
  where lower(trim(a)) in (select lower(trim(s)) from unnest(v_supervisors) s);

  if v_conflict is not null then
    raise exception 'อีเมลนี้อยู่ทั้งใน admin และหัวหน้างาน: % — เลือกบทบาทเดียว', v_conflict;
  end if;

  -- 3) ตั้งบทบาท (และเปิดบัญชีให้ใช้งานได้)
  update public.profiles set role = 'admin', is_active = true
   where email in (select lower(trim(x)) from unnest(v_admins) x);

  update public.profiles set role = 'supervisor', is_active = true
   where email in (select lower(trim(x)) from unnest(v_supervisors) x);

  -- 4) ผูกลูกทีมกับหัวหน้า
  if coalesce(array_length(v_teams, 1), 0) > 0 then
    for i in 1 .. array_length(v_teams, 1) loop
      if lower(trim(v_teams[i][1])) = lower(trim(v_teams[i][2])) then
        raise exception 'ตั้งตัวเองเป็นหัวหน้าไม่ได้: %', v_teams[i][1];
      end if;
      if not exists (
        select 1 from public.profiles
        where email = lower(trim(v_teams[i][2])) and role in ('supervisor', 'admin')
      ) then
        raise exception 'หัวหน้า % ต้องมีบทบาทหัวหน้างานหรือ admin (ใส่ไว้ใน v_supervisors หรือ v_admins)', v_teams[i][2];
      end if;

      update public.profiles
         set supervisor_id = (select id from public.profiles where email = lower(trim(v_teams[i][2])))
       where email = lower(trim(v_teams[i][1]));
    end loop;
  end if;

  raise notice 'เรียบร้อย';
end
$fn$;

-- ผลลัพธ์: รายชื่อทุกคน พร้อมบทบาทและหัวหน้า
select
  p.employee_code as "รหัสพนักงาน",
  p.first_name || ' ' || p.last_name as "ชื่อ",
  p.email as "อีเมล",
  case p.role when 'admin' then 'ผู้ดูแลระบบ' when 'supervisor' then 'หัวหน้างาน' else 'พนักงาน' end as "บทบาท",
  coalesce(s.first_name || ' ' || s.last_name, '-') as "หัวหน้าผู้อนุมัติ",
  case when p.is_active then 'ใช้งาน' else 'ปิดใช้งาน' end as "สถานะ"
from public.profiles p
left join public.profiles s on s.id = p.supervisor_id
order by p.role, p.employee_code;
