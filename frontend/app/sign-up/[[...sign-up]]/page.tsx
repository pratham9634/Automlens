import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { AutoMLensIcon } from "@/components/ui/logo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-center items-center p-4 selection:bg-cyan-500/25">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer" title="Back to Home">
          <div className="transition-transform group-hover:scale-105 shrink-0">
            <AutoMLensIcon size={42} />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl tracking-tight text-text-primary uppercase font-bold">
              AutoM<span className="text-accent">Lens</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-bold">
              Human-Assisted AutoML
            </span>
          </div>
        </Link>
        <p className="text-xs font-mono text-text-secondary mt-1">
          Create an account to begin training reproducible ML pipelines
        </p>
      </div>

      <div className="w-full max-w-md flex justify-center">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              card: "border-2 border-border shadow-neo bg-surface rounded-xl",
              headerTitle: "font-display font-bold text-text-primary",
              headerSubtitle: "text-text-muted text-xs",
              formButtonPrimary:
                "bg-accent hover:bg-accent/90 text-white font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg border-2 border-border shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all",
              formFieldInput:
                "border-2 border-border bg-canvas text-text-primary rounded-lg text-sm focus:border-accent focus:ring-0",
              footerActionLink: "text-accent hover:underline font-bold",
            },
          }}
        />
      </div>
    </div>
  );
}
