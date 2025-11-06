"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { useAuth } from "@/lib/auth/hooks";
import { logAuthError, ErrorCategory, ErrorSeverity } from "@/lib/errors/logger";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading, error, clearError, user } = useAuth();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      const returnTo = searchParams.get("returnTo") || "/chat";
      router.push(returnTo);
    }
  }, [user, loading, router, searchParams]);

  // Handle auth errors
  useEffect(() => {
    if (error) {
      const userMessage = getErrorMessage(error);
      let errorCategory = ErrorCategory.LOGIN_FAILED;
      let severity = ErrorSeverity.ERROR;

      // Categorize the error
      if (error.includes("Invalid login credentials")) {
        errorCategory = ErrorCategory.LOGIN_FAILED;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("Email not confirmed")) {
        errorCategory = ErrorCategory.LOGIN_FAILED;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("Too many requests")) {
        errorCategory = ErrorCategory.API_RATE_LIMIT;
        severity = ErrorSeverity.WARNING;
      } else if (error.includes("Network")) {
        errorCategory = ErrorCategory.NETWORK_ERROR;
        severity = ErrorSeverity.ERROR;
      }

      // Log the error
      logAuthError(
        errorCategory,
        `Login failed: ${error}`,
        {
          email: email,
          userMessage: userMessage,
          originalError: error,
          timestamp: new Date().toISOString()
        },
        undefined, // No user_id since login failed
        severity
      );

      toast({
        type: "error",
        description: userMessage,
      });
      setIsSubmitting(false);
    }
  }, [error, email]);

  // Clear error when component unmounts or user starts typing
  useEffect(() => {
    return () => {
      if (error) {
        clearError();
      }
    };
  }, [error, clearError]);

  const getErrorMessage = (error: string): string => {
    // Map Supabase auth errors to user-friendly messages
    if (error.includes("Invalid login credentials")) {
      return "Invalid email or password. Please try again.";
    }
    if (error.includes("Email not confirmed")) {
      return "Please check your email and click the confirmation link.";
    }
    if (error.includes("Too many requests")) {
      return "Too many login attempts. Please wait a moment and try again.";
    }
    if (error.includes("Network")) {
      return "Network error. Please check your connection and try again.";
    }
    return "Login failed. Please try again.";
  };

  const handleSubmit = async (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!emailValue || !password) {
      toast({
        type: "error",
        description: "Please enter both email and password.",
      });
      return;
    }

    setEmail(emailValue);
    setIsSubmitting(true);
    clearError();

    try {
      await signIn(emailValue, password);
      setIsSuccessful(true);
      
      // Redirect will be handled by the useEffect above
      toast({
        type: "success",
        description: "Successfully signed in!",
      });
    } catch (err) {
      // Log unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown login error';
      
      logAuthError(
        ErrorCategory.LOGIN_FAILED,
        `Unexpected login error: ${errorMessage}`,
        {
          email: emailValue,
          error: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        },
        undefined,
        ErrorSeverity.ERROR
      );
      
      console.error("Login error:", err);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render form if user is already authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign In</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton 
            isSuccessful={isSuccessful}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/register"
            >
              Sign up
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
