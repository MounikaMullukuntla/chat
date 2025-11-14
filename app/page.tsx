import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Floating Navigation */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="font-bold text-xl">AI Chatbot</div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 pt-24 pb-16">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 font-bold text-4xl md:text-6xl">
            AI-Powered Chat Experience
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground text-xl">
            Experience the future of conversation with our advanced AI chatbot.
            Get instant answers, creative assistance, and intelligent
            conversations.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 px-4 py-16" id="features">
        <div className="container mx-auto">
          <h2 className="mb-12 text-center font-bold text-3xl">Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary" />
              <h3 className="mb-2 font-semibold text-xl">
                Intelligent Conversations
              </h3>
              <p className="text-muted-foreground">
                Engage in natural, context-aware conversations with our advanced
                AI.
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary" />
              <h3 className="mb-2 font-semibold text-xl">
                Multi-Modal Support
              </h3>
              <p className="text-muted-foreground">
                Upload documents, images, and files for comprehensive AI
                assistance.
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary" />
              <h3 className="mb-2 font-semibold text-xl">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your conversations are protected with enterprise-grade security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="px-4 py-16" id="integrations">
        <div className="container mx-auto">
          <h2 className="mb-12 text-center font-bold text-3xl">Integrations</h2>
          <div className="text-center">
            <p className="mb-8 text-muted-foreground">
              Connect with your favorite tools and services
            </p>
            <div className="grid grid-cols-2 items-center gap-8 opacity-50 md:grid-cols-4">
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/50 px-4 py-16" id="faq">
        <div className="container mx-auto">
          <h2 className="mb-12 text-center font-bold text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-lg bg-background p-6">
              <h3 className="mb-2 font-semibold">
                How does the AI chatbot work?
              </h3>
              <p className="text-muted-foreground">
                Our AI chatbot uses advanced language models to understand and
                respond to your queries naturally.
              </p>
            </div>
            <div className="rounded-lg bg-background p-6">
              <h3 className="mb-2 font-semibold">Is my data secure?</h3>
              <p className="text-muted-foreground">
                Yes, we implement enterprise-grade security measures to protect
                your conversations and data.
              </p>
            </div>
            <div className="rounded-lg bg-background p-6">
              <h3 className="mb-2 font-semibold">Can I use it for free?</h3>
              <p className="text-muted-foreground">
                We offer both free and premium plans to suit different needs and
                usage levels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 AI Chatbot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
