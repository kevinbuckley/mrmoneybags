import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Learn how to simulate market crashes and bull runs in Mr. Money Bags. Pick a scenario, build a portfolio, set trading rules, and watch your fake money disappear.",
};

interface Step {
  number: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Pick your starting capital",
    body: "Choose how much fake money you want to risk. $10K for the cautious. $1B for the delusional. It all feels the same when the market tanks.",
  },
  {
    number: "02",
    title: "Choose a scenario",
    body: "Six historical periods. Each one a different flavor of chaos — or euphoria. The 2008 Financial Crisis, the dot-com wipeout, Black Monday 1987, COVID crash, 2021 crypto mania, and the 2022 crypto winter.",
  },
  {
    number: "03",
    title: "Build your portfolio",
    body: "Search from 22 real instruments: stocks, ETFs, crypto, gold, bonds. Set your allocation percentages. They sum to 100% — MoneyBags will remind you if you try to cheat.",
  },
  {
    number: "04",
    title: "Set trading rules (optional)",
    body: "Automate your strategy. Rules trigger based on price changes, portfolio value, position weights, and more. Example: \"If SPY drops 5% in a day, sell 20% of my AAPL.\" Rules fire automatically during playback.",
  },
  {
    number: "05",
    title: "Run the simulation",
    body: "Watch the market play out tick by tick. Hit play, set your speed (1x, 5x, 10x), and make manual trades whenever you panic. The simulation ends when the historical period is over.",
  },
  {
    number: "06",
    title: "See how badly you did",
    body: "The results screen shows your final portfolio value, Sharpe ratio, max drawdown, beta, volatility, and your best and worst day. Then it adds your run to the leaderboard so you can compare.",
  },
];

interface RuleExampleProps {
  condition: string;
  action: string;
}

function RuleExample({ condition, action }: RuleExampleProps) {
  return (
    <div className="bg-elevated border border-border rounded-xl p-4">
      <p className="text-xs text-muted font-mono mb-1">IF</p>
      <p className="text-primary text-sm mb-2">{condition}</p>
      <p className="text-xs text-muted font-mono mb-1">THEN</p>
      <p className="text-accent text-sm font-semibold">{action}</p>
    </div>
  );
}

export default function HowToPlayPage() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto pb-16">
      {/* Back nav */}
      <Link href="/" className="text-secondary text-sm hover:text-primary transition-colors">
        ← Home
      </Link>

      {/* Header */}
      <div className="mt-8 mb-10">
        <h1 className="text-3xl font-bold text-primary mb-2">How to Play</h1>
        <p className="text-secondary text-sm">
          Six steps. Zero real money. Infinite ways to lose.
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-6 mb-12">
        {STEPS.map((step) => (
          <div key={step.number} className="flex gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-accent font-mono text-xs font-bold">{step.number}</span>
            </div>
            <div className="pt-1">
              <h2 className="text-primary font-semibold text-sm mb-1">{step.title}</h2>
              <p className="text-secondary text-sm leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rule examples */}
      <div className="mb-12">
        <h2 className="text-primary font-semibold text-base mb-1">Example trading rules</h2>
        <p className="text-secondary text-xs mb-4">
          Rules are optional but powerful. Here are a few to get you started.
        </p>
        <div className="flex flex-col gap-3">
          <RuleExample
            condition="Portfolio drops more than 10% in a day"
            action="Move 50% of everything to cash"
          />
          <RuleExample
            condition="BTC position weight exceeds 40%"
            action="Sell 20% of BTC"
          />
          <RuleExample
            condition="SPY (market) gains more than 3% in a day"
            action="Buy $5,000 of QQQ"
          />
          <RuleExample
            condition="Cash balance exceeds $50,000"
            action="Buy $10,000 of GLD"
          />
        </div>
      </div>

      {/* Metrics glossary */}
      <div className="mb-12">
        <h2 className="text-primary font-semibold text-base mb-4">What the numbers mean</h2>
        <div className="flex flex-col gap-3">
          {[
            {
              term: "Sharpe Ratio",
              def: "Risk-adjusted return. Above 1.0 is good. Above 2.0 means you probably got lucky. Negative means you should have put it all in a savings account.",
            },
            {
              term: "Max Drawdown",
              def: "The worst peak-to-trough decline your portfolio experienced. This is the number that would have made you sell everything at exactly the wrong time.",
            },
            {
              term: "Annualized Volatility",
              def: "How much your portfolio swung around day to day, scaled to a yearly number. Higher = wilder ride.",
            },
            {
              term: "Beta vs S&P 500",
              def: "How much your portfolio moved relative to the market. Beta of 1 = moves with the market. Beta of 2 = twice as dramatic. Beta of 0 = didn't care.",
            },
          ].map(({ term, def }) => (
            <div key={term} className="bg-elevated border border-border rounded-xl p-4">
              <p className="text-primary font-semibold text-sm mb-1">{term}</p>
              <p className="text-secondary text-xs leading-relaxed">{def}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/setup"
          className="bg-accent text-white font-semibold rounded-xl px-8 py-3 text-sm hover:bg-accent/90 transition-colors inline-block"
        >
          Start Simulating →
        </Link>
        <p className="text-muted text-xs mt-3">
          No sign-up. No real money. No excuses.
        </p>
      </div>
    </main>
  );
}
