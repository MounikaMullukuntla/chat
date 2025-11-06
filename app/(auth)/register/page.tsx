"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { useAuth } from "@/lib/auth/hooks";
import { logAuthError, ErrorCategory, ErrorSeverity } from "@/lib/errors/logger";

export default function Page() {
  const router = useRouter();
  const { signUp, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  // Handle auth errors
  useEffect(() => {
    if (error) {
      // Map Supabase errors to user-friendly messages
      let errorMessage = "Failed to create account!";
      let errorCategory = ErrorCategory.REGISTRATION_FAILED;
      let severity = ErrorSeverity.ERROR;
      
      if (error.includes("already registered") || error.includes("already exists")) {
        errorMessage = "Account already exists!";
        errorCategory = ErrorCategory.REGISTRATION_FAILED;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("password")) {
        errorMessage = "Password must be at least 6 characters long!";
        errorCategory = ErrorCategory.VALIDATION_ERROR;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("email")) {
        errorMessage = "Please enter a valid email address!";
        errorCategory = ErrorCategory.VALIDATION_ERROR;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("weak password")) {
        errorMessage = "Password is too weak. Please choose a stronger password!";
        errorCategory = ErrorCategory.VALIDATION_ERROR;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("rate limit")) {
        errorMessage = "Too many attempts. Please try again later!";
        errorCategory = ErrorCategory.API_RATE_LIMIT;
        severity = ErrorSeverity.WARNING;
      }

      // Log the error
      logAuthError(
        errorCategory,
        `Registration failed: ${error}`,
        {
          email: email,
          userMessage: errorMessage,
          originalError: error,
          timestamp: new Date().toISOString()
        },
        undefined, // No user_id yet since registration failed
        severity
      );

      toast({ type: "error", description: errorMessage });
      setIsSubmitting(false);
    }
  }, [error, email]);

  const handleSubmit = async (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Basic validation
    if (!emailValue || !password) {
      toast({ 
        type: "error", 
        description: "Please fill in all fields!" 
      });
      return;
    }

    if (password.length < 6) {
      toast({ 
        type: "error", 
        description: "Password must be at least 6 characters long!" 
      });
      return;
    }

    setEmail(emailValue);
    setIsSubmitting(true);
    clearError();

    try {
      // Sign up with Supabase Auth with default user role
      await signUp(emailValue, password, {
        role: 'user',
        isActive: true,
        settings: {
          theme: 'system',
          notifications: true
        }
      });

      // Since signUp doesn't return the result, we need to check auth state differently
      // For now, assume email confirmation is required and show verification message
      setShowEmailVerification(true);
      setIsSubmitting(false);
      toast({ 
        type: "success", 
        description: "Please check your email for a verification link to complete your registration." 
      });

      // The auth state change will be handled by the context

    } catch (err) {
      // Log unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown registration error';
      
      logAuthError(
        ErrorCategory.REGISTRATION_FAILED,
        `Unexpected registration error: ${errorMessage}`,
        {
          email: emailValue,
          error: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        },
        undefined,
        ErrorSeverity.ERROR
      );
      
      console.error("Registration error:", err);
    }
  };

  // Show email verification message if needed
  if (showEmailVerification) {
    return (
      <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
        <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl">
          <div className="flex flex-col items-center justify-center gap-4 px-4 text-center sm:px-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-xl dark:text-zinc-50">Check Your Email</h3>
            <p className="text-gray-500 text-sm dark:text-zinc-400">
              We've sent a verification link to <strong>{email}</strong>. 
              Please check your email and click the link to complete your registration.
            </p>
            <p className="text-gray-400 text-xs dark:text-zinc-500">
              Didn't receive the email? Check your spam folder or try registering again.
            </p>
          </div>
          <div className="px-4 sm:px-16">
            <button
              onClick={() => {
                setShowEmailVerification(false);
                setEmail("");
                clearError();
              }}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Try Again
            </button>
            <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
              {"Already have an account? "}
              <Link
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                href="/login"
              >
                Sign in
              </Link>
              {" instead."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful} disabled={isSubmitting || loading}>
            {isSubmitting || loading ? "Creating Account..." : "Sign Up"}
          </SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/login"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
