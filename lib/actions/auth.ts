"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
};

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    // Never return raw Supabase error messages to the client
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "An account with this email already exists." };
    }
    if (error.message.toLowerCase().includes("password")) {
      return { error: "Password must be at least 6 characters." };
    }
    return { error: "Could not create account. Please try again." };
  }

  return {
    message:
      "Check your email for a verification link before signing in.",
  };
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Generic message — do not reveal whether the email or password is wrong
    return { error: "Incorrect email or password." };
  }

  revalidatePath("/", "layout");
  const redirectTo = formData.get("redirectTo") as string | null;
  redirect(redirectTo ?? "/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
