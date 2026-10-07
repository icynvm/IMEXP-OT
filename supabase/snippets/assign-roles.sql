-- =====================================================================
-- ตั้งบทบาท + สร้างแผนก + ผูกพนักงานกับแผนก/หัวหน้าทีม (ทำครั้งเดียวหลายคน)
-- =====================================================================
-- ต้องรันไฟล์ใน supabase/migrations ครบทั้ง 2 ไฟล์มาก่อน
--
-- วิธีใช้:
--   1) ให้ทุกคนในรายการ "สมัครสมาชิก" ที่หน้าเว็บก่อน (ต้องมีบัญชีอยู่แล้ว)
--   2) แก้ข้อมูลในส่วน "แก้ตรงนี้" ด้านล่าง (ส่วนไหนไม่ใช้ ให้เหลือเป็น '{}')
--   3) Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run (อย่าไฮไลต์ข้อความ)
--   4) ดูตารางผลลัพธ์ด้านล่างว่าถูกต้อง
--
-- ปลอดภัย:
--   - ถ้ามีอีเมล/แผนกไหนผิด จะหยุดทั้งหมดและไม่เปลี่ยนอะไรเลย
--   - รันซ้ำได้ (ผลลัพธ์เหมือนเดิม) / ไม่ลบผู้ใช้ และไม่แตะข้อมูล OT
--
-- บทบาท:
--   admin        = เห็น/จัดการได้ทุกอย่าง
--   หัวหน้าแผนก  = เห็น/อนุมัติทุกคนในแผนกของตัวเอง (หัวหน้าทีม + ลูกทีม)
--   หัวหน้าทีม   = เห็น/อนุมัติลูกทีมของตัวเอง
--   (หัวหน้าทุกระดับและ admin: คำขอของตัวเองอนุมัติอัตโนมัติ)
-- =====================================================================

do $fn$
declare
  -- ===================== แก้ตรงนี้ =====================

  v_admins text[] := array[
    'admin@your-company.com'
  ];

  v_department_heads text[] := array[
    'depthead1@your-company.com'
  ];

  v_team_leads text[] := array[
    'teamlead1@your-company.com',
    'teamlead2@your-company.com'
  ];

  -- แผนก: array['ชื่อแผนก', 'อีเมลหัวหน้าแผนก']  (ยังไม่มีหัวหน้า ใส่ '' )
  v_departments text[][] := array[
    array['บัญชี', 'depthead1@your-company.com'],
    array['ฝ่ายขาย', '']
  ];

  -- สมาชิก: array['อีเมล', 'ชื่อแผนก', 'อีเมลหัวหน้าทีม']  (ไม่มีหัวหน้าทีม ใส่ '' )
  -- หัวหน้าทีมก็ใส่ที่นี่ได้ เพื่อกำหนดแผนก (และหัวหน้าของหัวหน้าทีม ถ้ามี)
  v_members text[][] := array[
    array['teamlead1@your-company.com', 'บัญชี', 'depthead1@your-company.com'],
    array['teamlead2@your-company.com', 'ฝ่ายขาย', ''],
    array['employee1@your-company.com', 'บัญชี', 'teamlead1@your-company.com'],
    array['employee2@your-company.com', 'บัญชี', 'teamlead1@your-company.com'],
    array['employee3@your-company.com', 'ฝ่ายขาย', 'teamlead2@your-company.com']
  ];

  -- =====================================================
  v_missing text;
  v_dup text;
  v_dept_id uuid;
  i int;
begin
  -- 1) ตรวจว่าทุกอีเมลมีบัญชีในระบบ
  select string_agg(distinct e, ', ') into v_missing
  from (
    select lower(trim(x)) as e from unnest(v_admins || v_department_heads || v_team_leads) as x
    union all select lower(trim(v_departments[k][2])) from generate_subscripts(v_departments, 1) as k
    union all select lower(trim(v_members[k][1])) from generate_subscripts(v_members, 1) as k
    union all select lower(trim(v_members[k][3])) from generate_subscripts(v_members, 1) as k
  ) all_emails
  where e <> '' and not exists (select 1 from public.profiles p where p.email = all_emails.e);

  if v_missing is not null then
    raise exception 'ไม่พบบัญชีของอีเมล: % — ให้สมัครสมาชิกที่หน้าเว็บก่อน แล้วรันใหม่ (ยังไม่มีอะไรถูกเปลี่ยน)', v_missing;
  end if;

  -- 2) คนเดียวมีได้บทบาทเดียว
  select string_agg(e, ', ') into v_dup
  from (
    select lower(trim(x)) as e from unnest(v_admins || v_department_heads || v_team_leads) as x
    group by 1 having count(*) > 1
  ) t;

  if v_dup is not null then
    raise exception 'อีเมลนี้อยู่หลายบทบาท: % — เลือกบทบาทเดียว', v_dup;
  end if;

  -- 3) ตั้งบทบาท (และเปิดบัญชีให้ใช้งานได้)
  update public.profiles set role = 'admin', is_active = true
   where email in (select lower(trim(x)) from unnest(v_admins) x);
  update public.profiles set role = 'department_head', is_active = true
   where email in (select lower(trim(x)) from unnest(v_department_heads) x);
  update public.profiles set role = 'supervisor', is_active = true
   where email in (select lower(trim(x)) from unnest(v_team_leads) x);

  -- 4) สร้าง/อัปเดตแผนก และหัวหน้าแผนก
  if coalesce(array_length(v_departments, 1), 0) > 0 then
    for i in 1 .. array_length(v_departments, 1) loop
      if trim(v_departments[i][2]) <> '' and not exists (
        select 1 from public.profiles
        where email = lower(trim(v_departments[i][2])) and role::text = 'department_head'
      ) then
        raise exception 'หัวหน้าแผนก % ต้องอยู่ในรายการ v_department_heads', v_departments[i][2];
      end if;

      insert into public.departments (name, head_id)
      values (
        trim(v_departments[i][1]),
        (select id from public.profiles where email = lower(trim(v_departments[i][2])))
      )
      on conflict (name) do update set head_id = excluded.head_id
      returning id into v_dept_id;

      update public.profiles set department_id = v_dept_id
       where email = lower(trim(v_departments[i][2]));
    end loop;
  end if;

  -- 5) ผูกสมาชิกกับแผนก / หัวหน้าทีม
  if coalesce(array_length(v_members, 1), 0) > 0 then
    for i in 1 .. array_length(v_members, 1) loop
      v_dept_id := null;
      if trim(v_members[i][2]) <> '' then
        select id into v_dept_id from public.departments where name = trim(v_members[i][2]);
        if v_dept_id is null then
          raise exception 'ไม่พบแผนก "%" (ของ %) — เพิ่มใน v_departments ก่อน', v_members[i][2], v_members[i][1];
        end if;
      end if;

      if trim(v_members[i][3]) <> '' then
        if lower(trim(v_members[i][1])) = lower(trim(v_members[i][3])) then
          raise exception 'ตั้งตัวเองเป็นหัวหน้าไม่ได้: %', v_members[i][1];
        end if;
        if not exists (
          select 1 from public.profiles
          where email = lower(trim(v_members[i][3])) and role::text in ('supervisor', 'department_head', 'admin')
        ) then
          raise exception 'หัวหน้า % ต้องเป็นหัวหน้าทีม หัวหน้าแผนก หรือ admin', v_members[i][3];
        end if;
      end if;

      update public.profiles
         set department_id = v_dept_id,
             supervisor_id = (select id from public.profiles where email = lower(trim(v_members[i][3])))
       where email = lower(trim(v_members[i][1]));
    end loop;
  end if;

  raise notice 'เรียบร้อย';
end
$fn$;

-- ผลลัพธ์: รายชื่อทุกคน พร้อมบทบาท แผนก และหัวหน้า
select
  p.employee_code as "รหัสพนักงาน",
  p.first_name || ' ' || p.last_name as "ชื่อ",
  p.email as "อีเมล",
  case p.role::text
    when 'admin' then 'ผู้ดูแลระบบ'
    when 'department_head' then 'หัวหน้าแผนก'
    when 'supervisor' then 'หัวหน้าทีม'
    else 'พนักงาน'
  end as "บทบาท",
  coalesce(d.name, '-') as "แผนก",
  coalesce(s.first_name || ' ' || s.last_name, '-') as "หัวหน้าผู้อนุมัติ",
  case when p.is_active then 'ใช้งาน' else 'ปิดใช้งาน' end as "สถานะ"
from public.profiles p
left join public.profiles s on s.id = p.supervisor_id
left join public.departments d on d.id = p.department_id
order by d.name nulls last, p.role, p.employee_code;
