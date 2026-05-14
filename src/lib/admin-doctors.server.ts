import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DoctorSubmissionStatus = "pending" | "approved" | "rejected";

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin" as never,
  });

  if (error || !data) {
    throw new Error("Admin access required");
  }
}

export async function listDoctorSubmissionsForAdmin(status: DoctorSubmissionStatus) {
  const { data: doctors, error } = await supabaseAdmin
    .from("doctor_profiles")
    .select("user_id, specialty, license_number, fee, years_exp, location, bio, kyc_status, kyc_notes, updated_at")
    .eq("kyc_status", status)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const ids = (doctors ?? []).map((doctor) => doctor.user_id);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: documents }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, avatar_url, phone").in("id", ids),
    supabaseAdmin.from("doctor_documents").select("doctor_id").in("doctor_id", ids),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const documentCount = new Map<string, number>();
  for (const document of documents ?? []) {
    documentCount.set(document.doctor_id, (documentCount.get(document.doctor_id) ?? 0) + 1);
  }

  return (doctors ?? []).map((doctor) => ({
    ...doctor,
    profile: profileMap.get(doctor.user_id) ?? null,
    document_count: documentCount.get(doctor.user_id) ?? 0,
  }));
}

export async function getDoctorSubmissionForAdmin(doctorUserId: string) {
  const [{ data: doctor, error: doctorError }, { data: profile }, { data: docs, error: docsError }] = await Promise.all([
    supabaseAdmin.from("doctor_profiles").select("*").eq("user_id", doctorUserId).maybeSingle(),
    supabaseAdmin.from("profiles").select("id, full_name, avatar_url, phone").eq("id", doctorUserId).maybeSingle(),
    supabaseAdmin.from("doctor_documents").select("*").eq("doctor_id", doctorUserId).order("uploaded_at", { ascending: false }),
  ]);

  if (doctorError) throw new Error(doctorError.message);
  if (docsError) throw new Error(docsError.message);

  const enrichedDocs = await Promise.all(
    (docs ?? []).map(async (doc) => {
      const { data, error } = await supabaseAdmin.storage.from("doctor-kyc").createSignedUrl(doc.file_path, 900);
      return { ...doc, signedUrl: error ? null : data?.signedUrl ?? null };
    }),
  );

  return { doctor, profile, docs: enrichedDocs };
}

export async function decideDoctorSubmissionForAdmin(doctorUserId: string, status: DoctorSubmissionStatus, note?: string) {
  const kycNotes = status === "rejected" ? note?.trim() || null : null;
  const { data: doctor, error } = await supabaseAdmin
    .from("doctor_profiles")
    .update({ kyc_status: status, kyc_notes: kycNotes, updated_at: new Date().toISOString() })
    .eq("user_id", doctorUserId)
    .select("user_id, kyc_status, kyc_notes")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!doctor) throw new Error("Doctor submission not found");

  await supabaseAdmin.from("notifications").insert({
    user_id: doctorUserId,
    kind: `kyc_${status}`,
    title: status === "approved" ? "KYC approved" : "KYC needs attention",
    body: kycNotes ?? (status === "approved" ? "Your doctor profile is now live." : "Open KYC to view details."),
    link: "/doctor/kyc",
  });

  return doctor;
}