import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "doctor" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  primaryRole: AppRole | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; redirectTo: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "user" | "doctor",
  ) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshRoles: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const bootstrapped = useRef(false);

  const loadRoles = async (authUser: User): Promise<AppRole[]> => {
    const load = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id);
      if (error) throw error;
      return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
    };

    try {
      let nextRoles = await load();

      if (nextRoles.length === 0) {
        const requestedRole = authUser.user_metadata?.role === "doctor" ? "doctor" : "user";
        const rolesToCreate: AppRole[] = requestedRole === "doctor" ? ["user", "doctor"] : ["user"];

        for (const role of rolesToCreate) {
          await supabase
            .from("user_roles")
            .upsert({ user_id: authUser.id, role }, { onConflict: "user_id,role" });
        }

        if (requestedRole === "doctor") {
          await supabase
            .from("doctor_profiles")
            .upsert({ user_id: authUser.id }, { onConflict: "user_id" });
        }

        nextRoles = await load();
      }

      const safeRoles: AppRole[] = nextRoles.length > 0 ? nextRoles : ["user"];
      setRoles(safeRoles);
      return safeRoles;
    } catch (error) {
      console.error("Failed to load roles", error);
      setRoles(["user"]);
      return ["user"];
    } finally {
      setRolesLoaded(true);
    }
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setRolesLoaded(false);
        // defer to avoid deadlocks
        setTimeout(() => loadRoles(sess.user), 0);
      } else {
        setRoles([]);
        setRolesLoaded(true);
      }
    });
    // THEN getSession
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (bootstrapped.current) return;
        bootstrapped.current = true;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await loadRoles(data.session.user);
        } else {
          setRolesLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Failed to restore session", error);
        setSession(null);
        setUser(null);
        setRoles([]);
        setRolesLoaded(true);
      })
      .finally(() => setSessionLoaded(true));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loading = !sessionLoaded || (!!user && !rolesLoaded);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error?.message ?? "Sign in failed", redirectTo: null };
    setSession(data.session);
    setUser(data.user);
    setRolesLoaded(false);
    const fetched = await loadRoles(data.user);
    const role: AppRole | null = fetched.includes("admin")
      ? "admin"
      : fetched.includes("doctor")
        ? "doctor"
        : "user";
    setSessionLoaded(true);
    return { error: null, redirectTo: homePathFor(role) };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName, role) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/verify-email` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo, data: { full_name: fullName, role } },
    });
    if (error) return { error: error.message, needsConfirm: false };
    const needsConfirm = !data.session;
    return { error: null, needsConfirm };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  };

  const refreshRoles = async () => {
    if (user) await loadRoles(user);
  };

  const primaryRole: AppRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("doctor")
      ? "doctor"
      : roles.includes("user")
        ? "user"
        : null;

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        roles,
        loading,
        primaryRole,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshRoles,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function homePathFor(role: AppRole | null): string {
  if (role === "admin") return "/admin/overview";
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "user") return "/home";
  return "/login";
}
