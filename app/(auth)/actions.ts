// TODO: Replace entire file with Supabase auth actions
// This file contains NextAuth-specific login/register actions that will be replaced

"use server";

import { z } from "zod";

// TODO: Replace with Supabase auth functions
// import { createUser, getUser } from "@/lib/db/queries";

// TODO: Replace with Supabase auth
// import { signIn } from "./auth";

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

// TODO: Replace with Supabase auth login action
export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const _validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await Promise.resolve(); // Placeholder for async Supabase auth call
    // TODO: Implement Supabase signInWithPassword
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email: validatedData.email,
    //   password: validatedData.password,
    // });

    // Temporarily return success during migration
    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

// TODO: Replace with Supabase auth register action
export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const _validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await Promise.resolve(); // Placeholder for async Supabase auth call
    // TODO: Implement Supabase signUp
    // const { data, error } = await supabase.auth.signUp({
    //   email: validatedData.email,
    //   password: validatedData.password,
    // });

    // if (error) {
    //   if (error.message.includes('already registered')) {
    //     return { status: "user_exists" };
    //   }
    //   return { status: "failed" };
    // }

    // Temporarily return success during migration
    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
