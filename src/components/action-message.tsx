import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** แสดงผลลัพธ์จาก Server Action ในฟอร์ม (สำเร็จ = เขียว, ไม่สำเร็จ = แดง) */
export function ActionMessage({ state }: { state: { ok?: boolean; message?: string } }) {
  if (!state.message) return null;
  return state.ok ? (
    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
      <CircleCheck />
      <AlertDescription className="text-emerald-800">{state.message}</AlertDescription>
    </Alert>
  ) : (
    <Alert variant="destructive" className="border-red-200 bg-red-50">
      <CircleAlert />
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
