import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Play — MoneyBags",
};

const steps = [
  {
    number: "01",
    title: "Pick Your Disaster",
    body: "Choose from 6 famous historical scenarios (2008 crash, dot-com bubble, COVID, and more) or set a custom date range.",
  },
  {
    number: "02",
    title: "Build Your Portfolio",
    body: "Allocate your $10,000 across stocks, ETFs, crypto, bonds, options, leveraged positions, shorts, and dispersion trades.",
  },
  {
    number: "03",
    title: "Set Your Rules (Optional)",
    body: "Create conditional trading rules: 'IF TSLA drops 10% AND the market drops 5%, buy $500 more.' Your robot overlord will handle the rest.",
  },
  {
    number: "04",
    title: "Watch or Step Through",
    body: "Play the simulation like a movie at 1x/5x/10x speed, or step through day by day. Intervene at any time.",
  },
  {
    number: "05",
    title: "See How Bad It Was",
    body: "View your final portfolio value, Sharpe ratio, max drawdown, best/worst days, and a shareable results card.",
  },
];

export default function HowToPlayPage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <Link href="/" className="text-secondary text-sm mb-6 inline-block">← Back</Link>
      <h1 className="text-2xl font-bold text-primary mb-2">How to Play</h1>
      <p className="text-secondary text-sm mb-8">It&apos;s not rocket science. It&apos;s finance. Arguably worse.</p>

      <div className="flex flex-col gap-6">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-4">
            <span className="text-2xl font-bold font-mono text-accent/50 shrink-0 w-10">{step.number}</span>
            <div>
              <h2 className="text-base font-semibold text-primary mb-1">{step.title}</h2>
              <p className="text-secondary text-sm">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link
          href="/setup"
          className="bg-accent text-white font-semibold rounded-xl px-6 py-3 text-sm inline-block w-full text-center"
        >
          Start Simulating →
        </Link>
      </div>
    </main>
  );
}
