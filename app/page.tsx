import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold">AI Chatbot</div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            AI-Powered Chat Experience
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience the future of conversation with our advanced AI chatbot. 
            Get instant answers, creative assistance, and intelligent conversations.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Intelligent Conversations</h3>
              <p className="text-muted-foreground">
                Engage in natural, context-aware conversations with our advanced AI.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Multi-Modal Support</h3>
              <p className="text-muted-foreground">
                Upload documents, images, and files for comprehensive AI assistance.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your conversations are protected with enterprise-grade security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Integrations</h2>
          <div className="text-center">
            <p className="text-muted-foreground mb-8">
              Connect with your favorite tools and services
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-50">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 bg-background rounded-lg">
              <h3 className="font-semibold mb-2">How does the AI chatbot work?</h3>
              <p className="text-muted-foreground">
                Our AI chatbot uses advanced language models to understand and respond to your queries naturally.
              </p>
            </div>
            <div className="p-6 bg-background rounded-lg">
              <h3 className="font-semibold mb-2">Is my data secure?</h3>
              <p className="text-muted-foreground">
                Yes, we implement enterprise-grade security measures to protect your conversations and data.
              </p>
            </div>
            <div className="p-6 bg-background rounded-lg">
              <h3 className="font-semibold mb-2">Can I use it for free?</h3>
              <p className="text-muted-foreground">
                We offer both free and premium plans to suit different needs and usage levels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 AI Chatbot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}