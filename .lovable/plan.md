# Medic — Full App Build Plan

Goal: ship the full product the client is waiting on. Mobile-app feel (not a SaaS site), reference layout from the uploaded mockup, but **keep our existing green brand** (not purple). Preserve the existing hero messaging. Three roles: **User**, **Doctor**, **Admin**.

---

## 1. Design language (matches reference layout, our green)

- **Look & feel**: rounded cards (2xl radius), soft tinted backgrounds, large friendly typography, bold primary CTA pill buttons, bottom tab bar on mobile, "phone-app" framing.
- **Colors**: keep `--primary` green (#1FA84A). Add a soft surface tint (`--primary-soft`), gradient hero card, and dark text on light cards.
- **Typography**: copy the reference's vibe — pair **Plus Jakarta Sans** (headings, friendly geometric like the mockup) with **Inter** (body). Tabular numerals for prices/stats.
- **Splash / load screen**: full-bleed gradient screen with logo + tagline ("Caring from afar. Your health, our priority."), shown for ~1s on first load and during auth checks.
- **Reusable components**: `PhoneCard`, `StatPill`, `SpecialtyChip`, `DoctorCard`, `SectionHeader (title + See all)`, `BottomTabBar`, `Avatar`, `EmptyState`, `LoadingSplash`.

## 2. Architecture & roles

Enable **Lovable Cloud** (auth + DB + storage + edge functions) — required for accounts, email confirmation, KYC uploads, admin moderation.

### Roles
Stored in a separate `user_roles` table with `app_role` enum (`user`, `doctor`, `admin`) + `has_role()` security-definer function (no role on profiles — prevents privilege escalation).

### Route structure (file-based, TanStack)
```
/                        → marketing splash → Get Started (keep hero copy)
/login, /signup          → email + password, Google
/verify-email            → email confirmation pending screen
/reset-password          → password recovery

/_authenticated/         → gated layout, redirects by role
  /home                  → user dashboard (Hello {name}, search, promo, specialties, recent visits, schedule)
  /doctors               → browse + search/filter
  /doctors/$id           → doctor profile (Info / Availability / Education / Review tabs)
  /book/$doctorId        → booking flow (mode → slot → reason → confirm)
  /appointments          → upcoming / past
  /consultations         → chat threads + records
  /prescriptions         → e-prescriptions list
  /profile               → personal info, medical history, payments, security

/_doctor/                → doctor-only layout
  /dashboard             → today's appointments, earnings, ratings
  /schedule              → availability editor
  /patients              → patient list + records
  /consultations         → active chats
  /kyc                   → KYC submission (license, ID, selfie uploads) + status

/_admin/                 → admin-only layout
  /overview              → KPIs (users, doctors, bookings, revenue)
  /doctors               → KYC review queue (approve/reject with notes)
  /users                 → user management
  /appointments          → all bookings, disputes
  /reports               → flagged content / refunds
```

## 3. Database schema (Cloud)

- `profiles` (id → auth.users, full_name, avatar_url, dob, phone, gender)
- `user_roles` (user_id, role enum) + `has_role()` function
- `doctor_profiles` (user_id, specialty, bio, years_exp, fee, location, languages, kyc_status enum: pending/approved/rejected, kyc_notes)
- `doctor_documents` (id, doctor_id, type: license|gov_id|selfie|certificate, file_path, uploaded_at) — stored in `doctor-kyc` private bucket
- `doctor_availability` (doctor_id, weekday, start_time, end_time)
- `appointments` (id, patient_id, doctor_id, mode: chat|voice|video|in_person, scheduled_at, status, fee, reason)
- `consultations` (id, appointment_id, started_at, ended_at, notes)
- `messages` (id, consultation_id, sender_id, body, attachments, created_at)
- `prescriptions` (id, consultation_id, doctor_id, patient_id, items jsonb, issued_at, pdf_path)
- `medical_records` (id, patient_id, type, file_path, uploaded_by, created_at)
- `reviews` (id, doctor_id, patient_id, rating, comment, created_at)

**RLS on every table.** Patients see only their data; doctors see only their patients; admins (via `has_role`) see all. KYC bucket is private — only owner doctor + admins can read.

## 4. Auth

- Email + password with **email confirmation required** (`emailRedirectTo` set).
- Google sign-in enabled.
- Password reset → `/reset-password` page (handles `type=recovery` hash).
- Session via `onAuthStateChange` listener set up before `getSession()`.
- Role-based redirect after login: admin → `/admin/overview`, doctor → `/doctor/dashboard`, user → `/home`.
- Doctors signup flow auto-creates `doctor_profiles` row with `kyc_status='pending'` and routes them to `/doctor/kyc` until approved.

## 5. Doctor KYC (with image upload)

Form on `/doctor/kyc`:
- Specialty, years of experience, license number, bio, fee, location, languages
- Upload: medical license (image/pdf), government ID (image), selfie holding ID (image), optional certificates
- Files → private `doctor-kyc` bucket via `supabase.storage` with progress + zod-validated size/type
- Status banner: pending → "Under review (24–48h)", rejected → shows admin notes + resubmit, approved → unlocks doctor dashboard + listing

Admin queue at `/admin/doctors`: thumbnails, signed URLs to view docs, approve / reject (with reason) → updates `kyc_status` + sends notification.

## 6. User dashboard (matches reference)

Top: greeting "Hello, {name}" + avatar + notifications icon.
Search bar "Looking for doctors? Search by name or department".
Promo card with gradient (keep the "15% extra discount / first consultation free" pattern, branded green).
Horizontal **specialties row** (Cardiology, Paediatrics, Urology, Oncology, Dermatology, …).
**My Recent Visit** horizontal card scroller (doctor card with rating + specialty chip + calendar icon).
**My Checkup Schedule** list.
Bottom tab bar: Home / Appointments / Book / Messages / Profile.

## 7. Doctor profile page

Hero with photo, specialty, name, "$X /session", favorite + share icons.
Three stat pills: Experience / Rating / Patients.
Tabs: **Info / Availability / Education / Review**.
"At a glance" key-value grid (consultation fee, follow-up fee, patients attended, joined date, …).
Sticky **Next** / **Book** CTA at the bottom.

## 8. Booking flow

Steps: choose mode (chat/voice/video/in-person) → date + slot picker from `doctor_availability` → reason for visit → confirm → payment placeholder → success screen with calendar add.

## 9. Consultations

Chat thread per consultation (text + file attachments). Voice/video stubbed for v1 with a "Join call" button (real WebRTC later). Doctor can attach an e-prescription that generates a PDF stored in storage and listed under `/prescriptions`.

## 10. Admin dashboard

KPI cards (total users, doctors, bookings this week, revenue), recent signups, KYC queue count, charts (Recharts) for bookings/revenue trend, doctor & user tables with search and ban/suspend actions.

## 11. Cross-cutting: security, speed, UX

- **Security**: RLS everywhere, role checks via `has_role()`, private storage buckets with signed URLs, zod validation on every form (client + server fn), no secrets in client, rate-limit auth attempts via Supabase defaults.
- **Speed**: route-level code splitting (TanStack already does this), TanStack Query caching with sensible `staleTime`, lazy-load images, skeleton loaders everywhere, compress avatars on upload.
- **Humanized UX**: friendly empty states with illustrations, optimistic UI on chat send, toast feedback, accessible focus rings, large tap targets (44px+), reduced-motion respect, dark-mode tokens.
- **PWA niceties**: keep manifest + theme color; add install prompt later.

---

## Technical notes

- Stack stays TanStack Start v1 + Vite 7 + Tailwind v4 + shadcn/ui.
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers`.
- Charts: `recharts` (already available in shadcn).
- Date/slots: `date-fns`.
- Auth-protected routes use `_authenticated/`, `_doctor/`, `_admin/` layout routes with `beforeLoad` redirects (and `useServerFn` from components for protected server fns to avoid SSR 401s).
- Vercel config (`vercel.json` + `api/index.mjs`) already in place — no changes.

## Out of scope (v1, can ship after)

- Real WebRTC video/voice (button + placeholder room only).
- Live payments (Stripe/Paystack) — booking confirms with "Pay at clinic" / "Pay later" placeholder; we wire payments in a follow-up.
- Push notifications (web push) — we'll show in-app notifications only.
- Multi-language i18n.

---

## Build order

1. Enable Lovable Cloud + schema + RLS + storage buckets + roles.
2. Auth (signup/login/verify/reset) + role-based redirect + splash screen.
3. Design tokens + shared mobile-app shell (header, bottom tab, splash, fonts).
4. User: home dashboard → doctors list → doctor profile → booking → appointments → profile.
5. Doctor: signup branch → KYC form (with uploads) → dashboard → schedule → consultations.
6. Admin: KYC review queue → overview KPIs → user/doctor management.
7. Consultations chat + prescriptions PDF.
8. Polish: skeletons, empty states, error pages, SEO meta per route.

Approve and I'll start with step 1 (Cloud + schema) and roll straight through.
