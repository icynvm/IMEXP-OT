import { Label } from "@/components/ui/label";

/** ช่องกรอกข้อมูล: ชื่อช่อง + ช่องกรอก + คำอธิบาย/ข้อความ error */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    // content-start: ช่องที่อยู่แถวเดียวกันเริ่มที่ระดับเดียวกันเสมอ แม้อีกช่องมีคำอธิบาย/error ยาวกว่า
    <div className="grid content-start gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error?.length && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error?.map((e) => (
        <p key={e} className="text-destructive text-xs">
          {e}
        </p>
      ))}
    </div>
  );
}
