// Layer 1: lib — narrator message generation (pure, no state)
// See docs/design-docs/narrator-system.md

import type {
  NarratorEvent,
  NarratorTrigger,
  NarratorContext,
  NarratorChannel,
  NarratorSeverity,
} from "@/types/narrator";

let _eventCounter = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tmpl(template: string, ctx: NarratorContext): string {
  return template
    .replace("{ticker}", ctx.ticker ?? "your position")
    .replace("{pct}", ctx.changePct != null ? `${Math.abs(ctx.changePct * 100).toFixed(1)}%` : "")
    .replace("{rule}", ctx.ruleName ?? "a rule")
    .replace("{scenario}", ctx.scenario ?? "this scenario");
}

const MESSAGES: Record<NarratorTrigger, { channel: NarratorChannel; severity: NarratorSeverity; pool: string[] }> = {
  position_up_10: {
    channel: "popup",
    severity: "info",
    pool: [
      "{ticker} is up {pct}. Try not to get too attached.",
      "Up {pct} on {ticker}. The market is rewarding your chaos.",
      "{ticker} rising. Please don't tell anyone you knew this would happen.",
      "Look at {ticker} go. Don't check it again for 10 minutes.",
    ],
  },
  position_down_10: {
    channel: "popup",
    severity: "warning",
    pool: [
      "Down {pct} on {ticker}. Bold strategy. Let's see if it pays off.",
      "{ticker} is having a moment. A bad one.",
      "Ouch. {ticker} just reminded you why diversification exists.",
      "That {ticker} position is aging like milk.",
    ],
  },
  position_up_25: {
    channel: "popup",
    severity: "info",
    pool: [
      "Up {pct} on {ticker}. The gods of finance smile upon you.",
      "{ticker} up {pct}. Explaining this at dinner parties will be insufferable.",
      "Your {ticker} is working. No need to do anything hasty.",
    ],
  },
  position_down_25: {
    channel: "popup",
    severity: "critical",
    pool: [
      "{ticker} is down {pct}. This is not fine. Well, it's fake money. It's fine.",
      "Down {pct} on {ticker}. Leverage: the gift that keeps on taking.",
      "{ticker} has entered the danger zone. A real danger zone.",
    ],
  },
  portfolio_new_high: {
    channel: "popup",
    severity: "info",
    pool: [
      "New portfolio high. Don't tell your financial advisor.",
      "You're beating the market. For now.",
      "Portfolio all-time high achieved. You're basically Warren Buffett.",
    ],
  },
  portfolio_new_low: {
    channel: "popup",
    severity: "critical",
    pool: [
      "New portfolio low. Somewhere, a finance bro is laughing.",
      "You've discovered the floor. Hopefully.",
      "This is fine. Everything is fine. (It is not fine.)",
    ],
  },
  rule_fired: {
    channel: "popup",
    severity: "info",
    pool: [
      "Your robot overlord fired {rule}. As commanded.",
      "Rule triggered: {rule}. The machine has spoken.",
      "{rule} just fired. Automating your decisions since today.",
    ],
  },
  manual_trade: {
    channel: "chyron",
    severity: "info",
    pool: [
      "Manual trade executed. Brave.",
      "You intervened. The market has noted your confidence.",
      "Trade placed. The die is cast.",
    ],
  },
  option_expired_worthless: {
    channel: "popup",
    severity: "warning",
    pool: [
      "{ticker} options expired worthless. The premium is now a life lesson.",
      "Those options are now worth exactly as much as your advice about crypto.",
      "To the moon they said. They were wrong. The premium is gone.",
    ],
  },
  option_exercised: {
    channel: "popup",
    severity: "info",
    pool: [
      "{ticker} option exercised. Good for you, you option-having person.",
      "Options exercised on {ticker}. This is how it's supposed to work.",
    ],
  },
  margin_call: {
    channel: "popup",
    severity: "critical",
    pool: [
      "Margin call. The broker would like their money back. Immediately.",
      "Leverage: the gift that keeps on taking. Margin call triggered.",
      "Your leveraged position was forcibly liquidated. Classic.",
    ],
  },
  scenario_event: {
    channel: "popup",
    severity: "critical",
    pool: [
      "{eventLabel} — hope your portfolio is feeling okay.",
      "Breaking: {eventLabel}. This is now priced in. Maybe.",
    ],
  },
  simulation_start: {
    channel: "popup",
    severity: "info",
    pool: [
      "Simulation started. May your fake money fare better than your real instincts.",
      "And we're off. Try not to panic-sell in 3 days.",
      "Let's see how this goes. Spoiler: nobody knows.",
    ],
  },
  simulation_complete: {
    channel: "popup",
    severity: "info",
    pool: [
      "Simulation complete. The damage has been assessed.",
      "That's a wrap. Your portfolio has been thoroughly stress-tested.",
      "Simulation over. Results incoming. Brace yourself.",
    ],
  },
  ambient: {
    channel: "chyron",
    severity: "info",
    pool: [
      "BREAKING: Local investor down bad, blames market",
      "Analysts say 'buy low sell high', investors do the opposite",
      "Portfolio diversification: for people who want to lose money slowly",
      "Today's market: nobody knows anything, as usual",
      "Sources confirm: past performance does not indicate future results",
      "Reminder: Warren Buffett was not born knowing this stuff either",
      "Breaking: SPY continues to do what SPY does",
      "Experts disagree on everything. Markets proceed accordingly.",
      "New report: timing the market harder than it looks",
      "CNBC: volatility expected to continue being volatile",
      "This just in: risk exists",
      "Study: investors who check portfolios daily perform worse. You are still checking.",
    ],
  },
};

export function generateNarratorEvent(
  trigger: NarratorTrigger,
  ctx: NarratorContext = {}
): NarratorEvent {
  const config = MESSAGES[trigger];
  const raw = pick(config.pool);
  const message = tmpl(raw, ctx);
  return {
    id: `narrator-${++_eventCounter}`,
    channel: config.channel,
    message,
    trigger,
    severity: config.severity,
    timestamp: new Date().toISOString(),
  };
}

export function generateAmbientEvent(): NarratorEvent {
  return generateNarratorEvent("ambient");
}
