// Simple toast implementation for the admin forms
export function toast({
  type,
  description,
}: {
  type: "success" | "error" | "info";
  description: string;
}) {
  // For now, just use console.log - in a real app this would show a toast notification
  console.log(`[${type.toUpperCase()}] ${description}`);

  // You could implement a proper toast system here using libraries like:
  // - react-hot-toast
  // - sonner
  // - or a custom toast context
}
