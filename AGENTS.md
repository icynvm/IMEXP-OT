<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: IMEXP-OT (OT request & usage tracking)

Maintainers may not be developers. Keep code simple, explicit, and commented in Thai where it explains *why*.
Read `docs/STRUCTURE.md` (file map) and `docs/RULES.md` (business rules) before changing behavior.

## Architecture rules
- **The database is the source of truth for authorization and business rules.** All writes go through
  `security definer` functions in `supabase/migrations/*.sql` (`submit_ot_request`, `review_ot_usage`, …).
  Clients have SELECT-only grants; RLS scopes reads (own rows / supervisor's team / admin all).
  Never add INSERT/UPDATE/DELETE policies or grants for `authenticated`.
- Balances are computed by views (`ot_request_balances`, `employee_ot_summary`); never store a balance column.
- Server Actions (`src/actions/`) must call `requireUser()` first, validate with zod (`src/lib/validation.ts`),
  then call the RPC. Mirror DB rules in zod only for friendly Thai messages.
- `createAdminClient()` (secret key, bypasses RLS) is only for reading email recipients, the signup
  duplicate-code check, and resolving employee code → email at login. Do not use it for writes.
- Emails are sent with `after()` so failures never block the user action.
- `cacheComponents` is intentionally OFF: every page is per-user dynamic data.

## UI conventions
- shadcn/ui (new-york, Tailwind v4, CSS variables in `src/app/globals.css`) lives in `src/components/ui/`; add more with
  `npx shadcn@latest add <name>`. Radix primitives come from the `radix-ui` package. Icons: `lucide-react` only.
- Confirmations use `ConfirmDialog` (Radix AlertDialog). Success/error feedback: the action calls `setFlash()`
  (short-lived cookie, `src/lib/flash.ts`) then `redirect()`s to a clean URL; `FlashDialog` in the layouts shows it.
  Keep URLs clean: never put messages in query strings.
- All calendars use CalendarJS (`@calendarjs/react`) via `src/components/calendar/` (`ThaiCalendar`, `DatePicker`, `MonthPicker`).
  Month/year are chosen by clicking the header label (days → months grid → years grid), never with a dropdown/select.
  The wrapper renders its own Thai header (BE year), Thai weekday labels via CSS, and marks holiday/leave days by
  decorating cells (the library's `data` markers don't render in this version). Never use `<input type="date">`.
- `src/app/(app)/loading.tsx` gives instant skeleton feedback on navigation; nav items show a spinner via `useLinkStatus`.
- Forms that contain Radix Select/RadioGroup/Checkbox must use `ActionForm` + controlled state + hidden inputs:
  React resets `<form action>` after submit and Radix's form-reset listeners would revert the user's choices.

## Changing the database
- Never edit an applied migration. Add `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`.
- Keep `src/lib/types.ts`, `src/lib/constants.ts`, and `src/lib/errors.ts` in sync with schema changes.

## Before pushing
- `npm run check` (eslint + `next typegen && tsc`) and `npm run build` must pass.
- Optional full stack locally: `npx supabase start` (Docker) then `npx supabase db reset` to re-apply migrations.
