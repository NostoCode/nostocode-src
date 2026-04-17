import Link from "next/link";
import { Code2, Shield, Brain, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-20">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-2">
          ✨ Ancient Coding Mode
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-amber-500">Nosto</span>Code
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          Return to the origin of coding — keyboard only, no paste, no AI. Prove your skills with the Ancient Code Score.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
          {[
            { icon: Shield, title: "No External Paste", desc: "System clipboard is fully blocked" },
            { icon: Code2, title: "Internal Clipboard", desc: "Ctrl+C/V works within the editor" },
            { icon: Brain, title: "Ancient Score", desc: "Behavioral scoring on every submit" },
            { icon: Zap, title: "Real Judge", desc: "Python code execution via Piston" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-4 text-left space-y-1">
              <Icon className="w-5 h-5 text-amber-500 mb-2" />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/problems"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            <Code2 className="w-4 h-4" />
            Enter Platform
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 border border-border hover:bg-accent font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
