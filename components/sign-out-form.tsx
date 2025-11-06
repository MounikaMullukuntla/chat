import Form from "next/form";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/db/supabase-client";

export const SignOutForm = () => {
  return (
    <Form
      action={async () => {
        "use server";

        try {
          // Create Supabase client for server-side sign out
          const supabase = await createServerComponentClient();
          
          // Sign out the user
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error("Sign out error:", error);
            // Even if there's an error, we should still redirect
            // as the session might be partially cleared
          }
        } catch (err) {
          console.error("Unexpected sign out error:", err);
        } finally {
          // Always redirect to home page after sign out attempt
          // This ensures proper session cleanup and UI update
          redirect("/");
        }
      }}
      className="w-full"
    >
      <button
        className="w-full px-1 py-0.5 text-left text-red-500"
        type="submit"
      >
        Sign out
      </button>
    </Form>
  );
};
