import { cn } from "@/lib/utils";

/**
 * รายการแบบการ์ด สำหรับจอมือถือ (แสดงเฉพาะจอเล็กกว่า md = 768px)
 * ใช้คู่กับตาราง: ตารางครอบด้วย <div className="hidden md:block"> ส่วนมือถือใช้ <MobileList>
 * ทำไม: ตารางหลายคอลัมน์กว้างเกินจอมือถือ ต้องเลื่อนซ้าย-ขวา และปุ่มด้านขวา (แก้ไข / ลบ) มองไม่เห็น
 */
export function MobileList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("grid divide-y md:hidden", className)}>{children}</ul>;
}

/** 1 รายการ: หัวข้อ (+ บรรทัดรอง) ด้านซ้าย, ป้าย/สถานะด้านขวา, รายละเอียด, ปุ่มด้านล่าง */
export function MobileItem({
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("grid gap-3 py-4 first:pt-0 last:pb-0", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium break-words">{title}</div>
          {subtitle && <div className="text-muted-foreground text-xs break-words">{subtitle}</div>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {children && <dl className="grid gap-1.5 text-sm">{children}</dl>}
      {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    </li>
  );
}

/** 1 บรรทัดรายละเอียด: ชื่อช่องด้านซ้าย ค่าด้านขวา */
export function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
