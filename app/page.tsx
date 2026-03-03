import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-parchment">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-brand-navy hover:bg-brand-navy/10">
            Sign in
          </Button>
          <Button className="bg-brand-terracotta hover:bg-brand-terracotta-dark text-white">
            Get started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-28 text-center">
        <Badge
          className="mb-6 bg-brand-navy/10 text-brand-navy border-brand-navy/20 hover:bg-brand-navy/10"
          variant="outline"
        >
          Now available in Norwegian and English
        </Badge>
        <h1 className="text-6xl font-bold tracking-tight text-brand-navy leading-tight max-w-3xl mx-auto">
          Build with certainty.
        </h1>
        <p className="mt-6 text-xl text-brand-slate max-w-2xl mx-auto leading-relaxed">
          Bricks helps construction companies, architects, and engineers create
          documentation that meets city codes and legal requirements — with
          AI-powered compliance checks built in.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-brand-terracotta hover:bg-brand-terracotta-dark text-white px-8 text-base"
          >
            Start for free
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white px-8 text-base"
          >
            See how it works
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-terracotta mb-4">
            What Bricks does
          </p>
          <h2 className="text-4xl font-bold text-brand-navy text-center mb-16">
            Everything in one place
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-brand-parchment p-8 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-brand-navy/10 flex items-center justify-center mb-5">
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-brand-navy mb-2">{f.title}</h3>
                <p className="text-brand-slate leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 max-w-7xl mx-auto px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-terracotta mb-4">
          How it works
        </p>
        <h2 className="text-4xl font-bold text-brand-navy text-center mb-16">
          From upload to approval
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-brand-terracotta text-white text-lg font-bold flex items-center justify-center mb-4">
                {i + 1}
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">{step.title}</h3>
              <p className="text-sm text-brand-slate leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-navy py-20">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to get compliant?</h2>
          <p className="text-blue-200 mb-8 text-lg">
            Join construction teams across Norway using Bricks to get their documentation right,
            every time.
          </p>
          <Button
            size="lg"
            className="bg-brand-terracotta hover:bg-brand-terracotta-dark text-white px-10 text-base"
          >
            Start for free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-brand-slate">
            © {new Date().getFullYear()} Bricks. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "📋",
    title: "Document management",
    description:
      "Upload drawings, create proposals, and track every version — with a full audit trail from draft to approved.",
  },
  {
    icon: "⚡",
    title: "AI compliance checks",
    description:
      "Instantly check your documents against Norwegian city codes and legal requirements before submitting.",
  },
  {
    icon: "🤝",
    title: "Team collaboration",
    description:
      "Architects, engineers, and carpenters work together in structured review and approval workflows.",
  },
];

const steps = [
  {
    title: "Upload or create",
    description: "Upload existing files or write documents directly in Bricks.",
  },
  {
    title: "AI checks it",
    description: "Compliance issues are flagged automatically against relevant regulations.",
  },
  {
    title: "Team reviews",
    description: "Submit for review, gather feedback, and get sign-off from your team.",
  },
  {
    title: "Submit with confidence",
    description: "Send to authorities knowing your documentation is complete and compliant.",
  },
];
