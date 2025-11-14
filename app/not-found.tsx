import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-6xl text-muted-foreground">404</h1>
        <h2 className="mb-4 font-semibold text-2xl">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/chat">Go to Chat</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
