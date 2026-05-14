import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdmin,
  decideDoctorSubmissionForAdmin,
  getDoctorSubmissionForAdmin,
  listDoctorSubmissionsForAdmin,
} from "./admin-doctors.server";

const StatusSchema = z.enum(["pending", "approved", "rejected"]);

export const listDoctorSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ status: StatusSchema }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return listDoctorSubmissionsForAdmin(data.status);
  });

export const getDoctorSubmission = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return getDoctorSubmissionForAdmin(data.userId);
  });

export const decideDoctorSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    userId: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
    note: z.string().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return decideDoctorSubmissionForAdmin(data.userId, data.status, data.note);
  });