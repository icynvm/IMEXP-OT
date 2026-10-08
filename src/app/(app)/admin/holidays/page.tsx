import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteHoliday } from "@/actions/admin";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getHolidays } from "@/lib/data";
import { cn } from "@/lib/utils";
import { formatDate, todayTH } from "@/lib/format";
import { HolidayDialog } from "./holiday-dialog";

export const metadata: Metadata = { title: "วันหยุดนักขัตฤกษ์" };

const WEEKDAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

export default async function HolidaysPage({
  searchParams,
}: PageProps<"/admin/holidays">) {
  await requireUser(["admin"]);
  const today = todayTH();
  const thisYear = Number(today.slice(0, 4));
  const { year: yearParam } = await searchParams;
  const year =
    typeof yearParam === "string" && /^\d{4}$/.test(yearParam)
      ? Number(yearParam)
      : thisYear;

  const holidays = await getHolidays(`${year}-01-01`, `${year}-12-31`);
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  if (!years.includes(year)) years.push(year);

  return (
    <>
      <PageHeader
        title="วันหยุดนักขัตฤกษ์"
        description="วันหยุดของบริษัท แสดงในตารางวันหยุดและปฏิทินเลือกวันที่ของทุกคน"
        action={
          <HolidayDialog
            today={today}
            defaultDate={year === thisYear ? today : `${year}-01-01`}
            trigger={
              <Button>
                <Plus />
                เพิ่มวันหยุด
              </Button>
            }
          />
        }
      />
      <Card>
        <CardContent className="grid gap-4">
          {/* เลือกปี (พ.ศ.) */}
          <div className="flex flex-wrap gap-1">
            {years.sort().map((y) => (
              <Button
                key={y}
                variant={y === year ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={`/admin/holidays?year=${y}`}>{y + 543}</Link>
              </Button>
            ))}
          </div>
          {holidays.length === 0 ? (
            <EmptyState icon={CalendarOff}>
              ยังไม่มีวันหยุดของปี {year + 543} กด &quot;เพิ่มวันหยุด&quot;
            </EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  {/* จอมือถือ: ชื่อวัน (จันทร์ อังคาร …) แสดงใต้วันที่แทน */}
                  <TableHead className="hidden sm:table-cell">วัน</TableHead>
                  <TableHead>ชื่อวันหยุด</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => {
                  const weekday = new Date(
                    `${h.holiday_date}T12:00:00Z`,
                  ).getUTCDay();
                  return (
                    <TableRow key={h.holiday_date}>
                      <TableCell className="font-medium">
                        {formatDate(h.holiday_date)}
                        <div className="text-muted-foreground text-xs font-normal sm:hidden">
                          {WEEKDAYS[weekday]}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden sm:table-cell",
                          (weekday === 0 || weekday === 6) &&
                            "text-muted-foreground",
                        )}
                      >
                        {WEEKDAYS[weekday]}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {h.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <HolidayDialog
                            holiday={h}
                            today={today}
                            defaultDate={h.holiday_date}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Pencil />
                                <span className="sr-only sm:not-sr-only">
                                  แก้ไข
                                </span>
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 />
                                <span className="sr-only sm:not-sr-only">
                                  ลบ
                                </span>
                              </Button>
                            }
                            title={`ลบวันหยุด "${h.name}"?`}
                            description={formatDate(h.holiday_date)}
                            confirmLabel="ยืนยันการลบ"
                            destructive
                            action={deleteHoliday}
                            fields={{ holiday_date: h.holiday_date }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
