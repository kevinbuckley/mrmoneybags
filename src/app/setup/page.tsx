"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SCENARIOS } from "@/data/scenarios";
import { INSTRUMENTS } from "@/data/instruments";
import { loadPriceDataMap } from "@/data/loaders";
import { usePortfolioStore } from "@/store/portfolioStore";
import { useRulesStore } from "@/store/rulesStore";
import { useSimulationStore } from "@/store/simulationStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/format";
import type { Scenario } from "@/types/scenario";
import type { Rule, RuleSubject, RuleOperator, RuleActionType } from "@/types/rules";

const STEPS = ["Capital", "Scenario", "Portfolio", "Rules", "Review"];

const SUBJECT_LABELS: Record<RuleSubject, string> = {
  position_change_pct: "Position Change %",
  portfolio_change_pct: "Portfolio Change %",
  portfolio_value: "Portfolio Value ($)",
  position_weight_pct: "Position Weight %",
  cash_balance: "Cash Balance ($)",
  market_change_pct: "Market Change % (SPY)",
  days_elapsed: "Days Elapsed",
};

const SUBJECT_NEEDS_TICKER = new Set<RuleSubject>([
  "position_change_pct",
  "position_weight_pct",
]);

const ACTION_LABELS: Record<RuleActionType, string> = {
  buy: "Buy",
  sell_pct: "Sell % of Position",
  sell_all: "Sell All",
  rebalance: "Rebalance to %",
  move_to_cash: "Move All to Cash",
};

const ACTION_NEEDS_TICKER = new Set<RuleActionType>(["buy", "sell_pct", "sell_all"]);
const ACTION_NEEDS_AMOUNT = new Set<RuleActionType>(["buy"]);
const ACTION_NEEDS_PCT = new Set<RuleActionType>(["sell_pct", "rebalance"]);

const SCENARIO_RING: Record<string, string> = {
  red: "border-loss/50",
  green: "border-gain/50",
  yellow: "border-yellow-500/50",
};

const SCENARIO_BADGE_VARIANT: Record<string, "loss" | "gain" | "neutral"> = {
  red: "loss",
  green: "gain",
  yellow: "neutral",
};

interface ConditionForm {
  subject: RuleSubject;
  operator: RuleOperator;
  value: string;
  ticker: string;
}

interface RuleForm {
  label: string;
  conditions: ConditionForm[];
  actionType: RuleActionType;
  actionTicker: string;
  actionAmount: string;
  actionPct: string;
  cooldownTicks: number;
}

const BLANK_CONDITION: ConditionForm = {
  subject: "portfolio_change_pct",
  operator: "lt",
  value: "",
  ticker: "",
};

const BLANK_RULE_FORM: RuleForm = {
  label: "",
  conditions: [{ ...BLANK_CONDITION }],
  actionType: "sell_all",
  actionTicker: "",
  actionAmount: "",
  actionPct: "100",
  cooldownTicks: 5,
};

// ─── Rule templates ────────────────────────────────────────────────────────────

type TemplateFieldType = "pct" | "cash" | "ticker";

interface TemplateField {
  id: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  defaultValue?: string;
  min?: number;
  max?: number;
}

interface RuleTemplate {
  id: string;
  emoji: string;
  name: string;
  description: string;
  fields: TemplateField[];
  preview: (v: Record<string, string>) => string;
  build: (v: Record<string, string>, ruleCount: number) => Omit<Rule, "id">;
}

const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "daily-floor",
    emoji: "🛡️",
    name: "Daily loss limit",
    description: "Move everything to cash if the portfolio drops too much in one day",
    fields: [
      { id: "pct", label: "Sell if portfolio drops more than (% in one day)", type: "pct", placeholder: "5", defaultValue: "5", min: 0.5, max: 50 },
    ],
    preview: (v) => `IF portfolio drops >${v.pct || "?"}% today → move all to cash`,
    build: (v, _n) => ({
      label: `Daily loss limit (>${v.pct}%)`,
      enabled: true,
      conditions: [{ subject: "portfolio_change_pct" as RuleSubject, operator: "lte" as RuleOperator, value: -(parseFloat(v.pct) || 5) }],
      action: { type: "move_to_cash" as RuleActionType },
      firedCount: 0,
      cooldownTicks: 1,
    }),
  },
  {
    id: "take-profit",
    emoji: "💰",
    name: "Take profit",
    description: "Sell a position once it's up enough on the day — lock in gains",
    fields: [
      { id: "ticker", label: "Position to sell", type: "ticker" },
      { id: "pct", label: "Sell when daily gain exceeds (%)", type: "pct", placeholder: "10", defaultValue: "10", min: 0.5, max: 200 },
    ],
    preview: (v) => `IF ${v.ticker || "ticker"} gains >${v.pct || "?"}% today → sell all`,
    build: (v, _n) => ({
      label: `Take profit ${v.ticker} at +${v.pct}%`,
      enabled: true,
      conditions: [{ subject: "position_change_pct" as RuleSubject, operator: "gte" as RuleOperator, value: parseFloat(v.pct) || 10, ticker: v.ticker }],
      action: { type: "sell_all" as RuleActionType, ticker: v.ticker },
      firedCount: 0,
      cooldownTicks: 5,
    }),
  },
  {
    id: "cut-losses",
    emoji: "✂️",
    name: "Cut losses",
    description: "Dump a position if it falls too far in a single day",
    fields: [
      { id: "ticker", label: "Position to cut", type: "ticker" },
      { id: "pct", label: "Sell when daily loss exceeds (%)", type: "pct", placeholder: "7", defaultValue: "7", min: 0.5, max: 50 },
    ],
    preview: (v) => `IF ${v.ticker || "ticker"} drops >${v.pct || "?"}% today → sell all`,
    build: (v, _n) => ({
      label: `Cut losses ${v.ticker} at -${v.pct}%`,
      enabled: true,
      conditions: [{ subject: "position_change_pct" as RuleSubject, operator: "lte" as RuleOperator, value: -(parseFloat(v.pct) || 7), ticker: v.ticker }],
      action: { type: "sell_all" as RuleActionType, ticker: v.ticker },
      firedCount: 0,
      cooldownTicks: 5,
    }),
  },
  {
    id: "trim-position",
    emoji: "⚖️",
    name: "Trim oversized position",
    description: "Sell a slice of a position when it grows too large in your portfolio",
    fields: [
      { id: "ticker", label: "Position to trim", type: "ticker" },
      { id: "maxWeight", label: "Trim when position exceeds (% of portfolio)", type: "pct", placeholder: "30", defaultValue: "30", min: 1, max: 99 },
      { id: "sellPct", label: "How much of it to sell (%)", type: "pct", placeholder: "25", defaultValue: "25", min: 1, max: 100 },
    ],
    preview: (v) => `IF ${v.ticker || "ticker"} > ${v.maxWeight || "?"}% of portfolio → sell ${v.sellPct || "?"}% of it`,
    build: (v, _n) => ({
      label: `Trim ${v.ticker} when >${v.maxWeight}%`,
      enabled: true,
      conditions: [{ subject: "position_weight_pct" as RuleSubject, operator: "gte" as RuleOperator, value: parseFloat(v.maxWeight) || 30, ticker: v.ticker }],
      action: { type: "sell_pct" as RuleActionType, ticker: v.ticker, pct: parseFloat(v.sellPct) || 25 },
      firedCount: 0,
      cooldownTicks: 10,
    }),
  },
  {
    id: "buy-the-dip",
    emoji: "📉",
    name: "Buy the dip",
    description: "Scoop up more of something when the market tanks on the day",
    fields: [
      { id: "dropPct", label: "Buy when market drops more than (% in one day)", type: "pct", placeholder: "3", defaultValue: "3", min: 0.5, max: 20 },
      { id: "ticker", label: "What to buy", type: "ticker" },
      { id: "amount", label: "Dollar amount to spend", type: "cash", placeholder: "5000", defaultValue: "5000" },
    ],
    preview: (v) => `IF market drops >${v.dropPct || "?"}% today → buy $${v.amount || "?"} of ${v.ticker || "ticker"}`,
    build: (v, _n) => ({
      label: `Buy ${v.ticker} on -${v.dropPct}% dip`,
      enabled: true,
      conditions: [{ subject: "market_change_pct" as RuleSubject, operator: "lte" as RuleOperator, value: -(parseFloat(v.dropPct) || 3) }],
      action: { type: "buy" as RuleActionType, ticker: v.ticker, amount: parseFloat(v.amount) || 5000 },
      firedCount: 0,
      cooldownTicks: 5,
    }),
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function conditionSummary(c: ConditionForm): string {
  const subj = SUBJECT_LABELS[c.subject];
  const ticker = c.ticker ? ` (${c.ticker})` : "";
  const op = { gt: ">", lt: "<", gte: ">=", lte: "<=" }[c.operator];
  return `${subj}${ticker} ${op} ${c.value || "?"}`;
}

function actionSummary(form: RuleForm): string {
  const label = ACTION_LABELS[form.actionType];
  const ticker = ACTION_NEEDS_TICKER.has(form.actionType) && form.actionTicker
    ? ` ${form.actionTicker}` : "";
  const amount = ACTION_NEEDS_AMOUNT.has(form.actionType) && form.actionAmount
    ? ` $${Number(form.actionAmount).toLocaleString()}` : "";
  const pct = ACTION_NEEDS_PCT.has(form.actionType) && form.actionPct
    ? ` ${form.actionPct}%` : "";
  return `${label}${ticker}${amount}${pct}`;
}

// ─── Step components ───────────────────────────────────────────────────────────

function StepCapital() {
  const startingCapital = usePortfolioStore((s) => s.startingCapital);
  const setStartingCapital = usePortfolioStore((s) => s.setStartingCapital);
  const [raw, setRaw] = useState(String(startingCapital));

  const commit = (val: string) => {
    const n = parseFloat(val.replace(/[^0-9.]/g, ""));
    if (!isNaN(n)) setStartingCapital(n);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Starting capital</h2>
        <p className="text-secondary text-sm">How much fake money are you willing to lose?</p>
      </div>
      <Input
        type="number"
        prefix="$"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => commit(raw)}
        min={1000}
        max={1_000_000_000}
        placeholder="10000"
      />
      <div className="flex gap-2">
        {[1_000, 10_000, 100_000].map((amt) => (
          <button
            key={amt}
            onClick={() => { setRaw(String(amt)); setStartingCapital(amt); }}
            className={`flex-1 rounded-xl border py-2 text-sm font-mono transition-colors ${
              startingCapital === amt
                ? "border-accent text-accent bg-accent/10"
                : "border-border text-secondary hover:border-secondary"
            }`}
          >
            {formatCurrency(amt, true)}
          </button>
        ))}
      </div>
      <p className="text-muted text-xs text-center font-mono">
        {formatCurrency(startingCapital)} of very real fake money
      </p>
    </div>
  );
}

function StepScenario() {
  const selectedScenario = usePortfolioStore((s) => s.scenario);
  const setScenario = usePortfolioStore((s) => s.setScenario);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Choose a scenario</h2>
        <p className="text-secondary text-sm">Pick the historical event you want to relive.</p>
      </div>
      <div className="flex flex-col gap-2">
        {SCENARIOS.map((scenario) => {
          const selected = selectedScenario?.slug === scenario.slug;
          return (
            <button
              key={scenario.slug}
              onClick={() => setScenario(scenario)}
              className={`rounded-xl border p-4 text-left transition-all ${
                selected
                  ? `${SCENARIO_RING[scenario.color]} bg-elevated ring-1 ring-accent/30`
                  : "border-border hover:border-secondary"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant={SCENARIO_BADGE_VARIANT[scenario.color]}>
                  {scenario.startDate.slice(0, 4)}–{scenario.endDate.slice(0, 4)}
                </Badge>
                {selected && <Badge variant="accent">Selected</Badge>}
              </div>
              <p className="text-primary font-semibold text-sm mt-1">{scenario.name}</p>
              <p className="text-secondary text-xs italic mt-0.5">{scenario.snarkDescription}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepPortfolio() {
  const scenario = usePortfolioStore((s) => s.scenario);
  const startingCapital = usePortfolioStore((s) => s.startingCapital);
  const allocations = usePortfolioStore((s) => s.allocations);
  const addAllocation = usePortfolioStore((s) => s.addAllocation);
  const removeAllocation = usePortfolioStore((s) => s.removeAllocation);
  const updateAllocationPct = usePortfolioStore((s) => s.updateAllocationPct);
  const [search, setSearch] = useState("");

  const scenarioSlug = scenario?.slug ?? "";
  const filtered = INSTRUMENTS.filter((inst) => {
    if (!inst.availableScenarios.includes(scenarioSlug)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inst.ticker.toLowerCase().includes(q) ||
      inst.name.toLowerCase().includes(q) ||
      inst.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const totalPct = allocations.reduce((s, a) => s + a.pct, 0);
  const totalOk = Math.abs(totalPct - 100) < 1.5;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Build your portfolio</h2>
        <p className="text-secondary text-sm">
          Select instruments and set allocations. Total should be 100%.
        </p>
      </div>
      <Input
        placeholder="Filter by ticker, name, or tag..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-border rounded-xl p-1">
        {filtered.length === 0 ? (
          <p className="text-muted text-xs py-2 text-center">No instruments match &ldquo;{search}&rdquo;</p>
        ) : (
          filtered.map((inst) => {
            const added = allocations.some((a) => a.ticker === inst.ticker);
            return (
              <button
                key={inst.ticker}
                onClick={() => { if (!added) { addAllocation(inst.ticker); setSearch(""); } }}
                disabled={added}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-elevated text-left disabled:opacity-40 transition-colors"
              >
                <span className="font-mono font-bold text-accent text-sm w-14 shrink-0">
                  {inst.ticker}
                </span>
                <span className="text-secondary text-xs truncate flex-1">{inst.name}</span>
                <Badge variant="neutral" className="shrink-0">{inst.type}</Badge>
              </button>
            );
          })
        )}
      </div>
      {allocations.length === 0 ? (
        <p className="text-muted text-xs text-center py-1">
          Tap any instrument above to add it
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {allocations.map((alloc) => {
            const inst = INSTRUMENTS.find((i) => i.ticker === alloc.ticker);
            return (
              <div key={alloc.ticker} className="flex items-center gap-3 bg-elevated rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-accent font-mono font-bold text-sm">{alloc.ticker}</p>
                  <p className="text-muted text-xs truncate">{inst?.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={alloc.pct.toFixed(1)}
                    onChange={(e) =>
                      updateAllocationPct(alloc.ticker, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 bg-surface border border-border rounded-lg px-2 py-1.5 text-primary text-sm font-mono text-right focus:outline-none focus:border-accent"
                    min={0}
                    max={100}
                  />
                  <span className="text-secondary text-sm">%</span>
                  <button
                    onClick={() => removeAllocation(alloc.ticker)}
                    className="text-muted hover:text-loss text-sm transition-colors ml-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border mt-1">
            <span className="text-secondary text-xs">Total</span>
            <span className={`font-mono font-semibold text-sm ${totalOk ? "text-gain" : "text-loss"}`}>
              {totalPct.toFixed(1)}%{!totalOk ? " (needs 100%)" : ""}
            </span>
          </div>
          <div className="flex items-center justify-between px-4">
            <span className="text-muted text-xs">Invested</span>
            <span className="font-mono text-xs text-secondary">
              {formatCurrency((totalPct / 100) * startingCapital)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StepRules({ scenario }: { scenario: Scenario | null }) {
  const rules = useRulesStore((s) => s.rules);
  const addRule = useRulesStore((s) => s.addRule);
  const removeRule = useRulesStore((s) => s.removeRule);
  const toggleRule = useRulesStore((s) => s.toggleRule);

  type SheetStep = "pick" | "form" | "custom";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>("pick");
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState<RuleForm>({ ...BLANK_RULE_FORM, conditions: [{ ...BLANK_CONDITION }] });

  const scenarioTickers = INSTRUMENTS
    .filter((i) => scenario ? i.availableScenarios.includes(scenario.slug) : false)
    .map((i) => i.ticker);

  const openSheet = () => {
    setSheetStep("pick");
    setSelectedTemplate(null);
    setTemplateValues({});
    setForm({ ...BLANK_RULE_FORM, conditions: [{ ...BLANK_CONDITION }] });
    setSheetOpen(true);
  };

  const pickTemplate = (tmpl: RuleTemplate) => {
    const defaults: Record<string, string> = {};
    tmpl.fields.forEach((f) => { defaults[f.id] = f.defaultValue ?? ""; });
    setSelectedTemplate(tmpl);
    setTemplateValues(defaults);
    setSheetStep("form");
  };

  const templateCanSave = selectedTemplate !== null &&
    selectedTemplate.fields.every((f) => {
      const v = templateValues[f.id] ?? "";
      if (f.type === "ticker") return v !== "";
      return v !== "" && !isNaN(parseFloat(v));
    });

  const saveTemplateRule = () => {
    if (!selectedTemplate || !templateCanSave) return;
    const built = selectedTemplate.build(templateValues, rules.length);
    addRule({ id: makeRuleId(), ...built });
    setSheetOpen(false);
  };

  const updateCondition = (idx: number, patch: Partial<ConditionForm>) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };

  const saveCustomRule = () => {
    const conditions = form.conditions.filter((c) => c.value !== "").map((c) => ({
      subject: c.subject,
      operator: c.operator,
      value: parseFloat(c.value),
      ...(SUBJECT_NEEDS_TICKER.has(c.subject) && c.ticker ? { ticker: c.ticker } : {}),
    }));
    if (conditions.length === 0) return;
    const rule: Rule = {
      id: makeRuleId(),
      label: form.label || `Rule ${rules.length + 1}`,
      enabled: true,
      conditions,
      action: {
        type: form.actionType,
        ...(ACTION_NEEDS_TICKER.has(form.actionType) && form.actionTicker ? { ticker: form.actionTicker } : {}),
        ...(ACTION_NEEDS_AMOUNT.has(form.actionType) && form.actionAmount ? { amount: parseFloat(form.actionAmount) } : {}),
        ...(ACTION_NEEDS_PCT.has(form.actionType) && form.actionPct ? { pct: parseFloat(form.actionPct) } : {}),
      },
      firedCount: 0,
      cooldownTicks: form.cooldownTicks,
    };
    addRule(rule);
    setSheetOpen(false);
  };

  const sheetTitle =
    sheetStep === "pick" ? "Add a rule" :
    sheetStep === "form" && selectedTemplate ? selectedTemplate.name :
    "Custom rule";

  const OPMAP = { gt: ">", lt: "<", gte: ">=", lte: "<=" } as const;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Automation rules</h2>
        <p className="text-secondary text-sm">
          Set up rules that fire automatically during the simulation. Optional, but powerful.
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="text-muted text-xs text-center py-4">
          No rules yet. Add one to automate your panic-selling.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-elevated rounded-xl px-4 py-3">
              <div className="flex items-start gap-2 mb-1.5">
                <p className="text-primary text-sm font-semibold flex-1">{rule.label}</p>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`text-xs font-mono px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                    rule.enabled ? "border-gain/50 text-gain bg-gain/10" : "border-border text-muted"
                  }`}
                >
                  {rule.enabled ? "ON" : "OFF"}
                </button>
                <button onClick={() => removeRule(rule.id)} className="text-muted hover:text-loss text-xs shrink-0">
                  remove
                </button>
              </div>
              {rule.conditions.map((c, i) => (
                <p key={i} className="text-secondary text-xs font-mono">
                  {i === 0 ? "IF" : "AND"} {SUBJECT_LABELS[c.subject]}
                  {c.ticker ? ` (${c.ticker})` : ""} {OPMAP[c.operator]} {c.value}
                </p>
              ))}
              <p className="text-accent text-xs font-mono mt-0.5">
                THEN {ACTION_LABELS[rule.action.type]}
                {rule.action.ticker ? ` ${rule.action.ticker}` : ""}
                {rule.action.amount ? ` $${rule.action.amount.toLocaleString()}` : ""}
                {rule.action.pct !== undefined ? ` ${rule.action.pct}%` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {rules.length < 10 && (
        <Button variant="secondary" onClick={openSheet} className="w-full">
          + Add Rule
        </Button>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle}>

        {/* ── Step 1: Template picker ── */}
        {sheetStep === "pick" && (
          <div className="flex flex-col gap-2 pb-6">
            <p className="text-secondary text-xs mb-1">
              Pick a template to get started fast, or build from scratch.
            </p>
            {RULE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => pickTemplate(tmpl)}
                className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4 text-left hover:border-accent/40 active:scale-[0.99] transition-all"
              >
                <span className="text-2xl shrink-0">{tmpl.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-primary font-semibold text-sm">{tmpl.name}</p>
                  <p className="text-secondary text-xs leading-snug mt-0.5">{tmpl.description}</p>
                </div>
                <span className="text-muted text-xl shrink-0">›</span>
              </button>
            ))}
            <button
              onClick={() => setSheetStep("custom")}
              className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4 text-left hover:border-accent/40 active:scale-[0.99] transition-all mt-1"
            >
              <span className="text-2xl shrink-0">⚙️</span>
              <div className="flex-1 min-w-0">
                <p className="text-primary font-semibold text-sm">Custom rule</p>
                <p className="text-secondary text-xs mt-0.5">Any condition, any action — full control</p>
              </div>
              <span className="text-muted text-xl shrink-0">›</span>
            </button>
          </div>
        )}

        {/* ── Step 2: Template form ── */}
        {sheetStep === "form" && selectedTemplate && (
          <div className="flex flex-col gap-5 pb-6">
            <button
              onClick={() => setSheetStep("pick")}
              className="text-secondary text-sm text-left hover:text-primary transition-colors"
            >
              ← Back
            </button>

            {/* Live preview */}
            <div className="bg-surface rounded-xl p-3">
              <p className="text-muted text-xs font-mono mb-1 uppercase tracking-wider">Rule preview</p>
              <p className="text-accent text-sm font-mono leading-relaxed">
                {selectedTemplate.preview(templateValues)}
              </p>
            </div>

            {selectedTemplate.fields.map((field) => (
              <div key={field.id}>
                <p className="text-secondary text-xs font-medium mb-2">{field.label}</p>
                {field.type === "ticker" ? (
                  <select
                    value={templateValues[field.id] ?? ""}
                    onChange={(e) => setTemplateValues((v) => ({ ...v, [field.id]: e.target.value }))}
                    className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-primary text-sm font-mono focus:outline-none focus:border-accent min-h-[52px]"
                  >
                    <option value="">Select ticker…</option>
                    {scenarioTickers.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : field.type === "cash" ? (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      value={templateValues[field.id] ?? ""}
                      onChange={(e) => setTemplateValues((v) => ({ ...v, [field.id]: e.target.value }))}
                      className="w-full bg-elevated border border-border rounded-xl pl-8 pr-4 py-3 text-primary text-sm font-mono focus:outline-none focus:border-accent min-h-[52px]"
                      min={field.min}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      value={templateValues[field.id] ?? ""}
                      onChange={(e) => setTemplateValues((v) => ({ ...v, [field.id]: e.target.value }))}
                      className="w-full bg-elevated border border-border rounded-xl px-4 pr-10 py-3 text-primary text-sm font-mono focus:outline-none focus:border-accent min-h-[52px]"
                      min={field.min}
                      max={field.max}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none">%</span>
                  </div>
                )}
              </div>
            ))}

            <Button onClick={saveTemplateRule} disabled={!templateCanSave} className="w-full">
              Add Rule
            </Button>
          </div>
        )}

        {/* ── Step 3: Custom rule builder ── */}
        {sheetStep === "custom" && (
          <div className="flex flex-col gap-5 pb-6">
            <button
              onClick={() => setSheetStep("pick")}
              className="text-secondary text-sm text-left hover:text-primary transition-colors"
            >
              ← Back
            </button>
            <Input
              label="Rule name (optional)"
              placeholder={`Rule ${rules.length + 1}`}
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <div>
              <p className="text-xs text-secondary font-medium mb-2">Conditions (all must be true)</p>
              <div className="flex flex-col gap-3">
                {form.conditions.map((cond, idx) => (
                  <div key={idx} className="bg-surface rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-xs font-mono w-8 shrink-0">
                        {idx === 0 ? "IF" : "AND"}
                      </span>
                      <select
                        value={cond.subject}
                        onChange={(e) => updateCondition(idx, { subject: e.target.value as RuleSubject, ticker: "" })}
                        className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-xs focus:outline-none focus:border-accent min-h-[44px]"
                      >
                        {(Object.keys(SUBJECT_LABELS) as RuleSubject[]).map((s) => (
                          <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                    {SUBJECT_NEEDS_TICKER.has(cond.subject) && (
                      <select
                        value={cond.ticker}
                        onChange={(e) => updateCondition(idx, { ticker: e.target.value })}
                        className="bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-xs focus:outline-none focus:border-accent min-h-[44px]"
                      >
                        <option value="">Select ticker…</option>
                        {scenarioTickers.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, { operator: e.target.value as RuleOperator })}
                        className="bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-xs focus:outline-none focus:border-accent w-20 min-h-[44px]"
                      >
                        <option value="gt">&gt;</option>
                        <option value="lt">&lt;</option>
                        <option value="gte">&gt;=</option>
                        <option value="lte">&lt;=</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Value"
                        value={cond.value}
                        onChange={(e) => updateCondition(idx, { value: e.target.value })}
                        className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-xs font-mono focus:outline-none focus:border-accent min-h-[44px]"
                      />
                      {form.conditions.length > 1 && (
                        <button
                          onClick={() => setForm((f) => ({ ...f, conditions: f.conditions.filter((_, i) => i !== idx) }))}
                          className="text-muted hover:text-loss text-sm px-2 min-h-[44px]"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.conditions.length < 3 && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, conditions: [...f.conditions, { ...BLANK_CONDITION }] }))}
                    className="text-secondary text-xs hover:text-primary transition-colors text-left py-1"
                  >
                    + Add condition
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-secondary font-medium mb-2">Then do this</p>
              <div className="bg-surface rounded-xl p-3 flex flex-col gap-2">
                <select
                  value={form.actionType}
                  onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value as RuleActionType, actionTicker: "" }))}
                  className="bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-xs focus:outline-none focus:border-accent min-h-[44px]"
                >
                  {(Object.keys(ACTION_LABELS) as RuleActionType[]).map((a) => (
                    <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                  ))}
                </select>
                {ACTION_NEEDS_TICKER.has(form.actionType) && (
                  <select
                    value={form.actionTicker}
                    onChange={(e) => setForm((f) => ({ ...f, actionTicker: e.target.value }))}
                    className="bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-xs focus:outline-none focus:border-accent min-h-[44px]"
                  >
                    <option value="">Select ticker…</option>
                    {scenarioTickers.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                {ACTION_NEEDS_AMOUNT.has(form.actionType) && (
                  <Input
                    type="number"
                    prefix="$"
                    placeholder="Dollar amount"
                    value={form.actionAmount}
                    onChange={(e) => setForm((f) => ({ ...f, actionAmount: e.target.value }))}
                  />
                )}
                {ACTION_NEEDS_PCT.has(form.actionType) && (
                  <Input
                    type="number"
                    placeholder="Percentage (0-100)"
                    value={form.actionPct}
                    onChange={(e) => setForm((f) => ({ ...f, actionPct: e.target.value }))}
                    min={0}
                    max={100}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary font-medium">Cooldown (days)</p>
                <p className="text-muted text-xs">Min days before rule fires again</p>
              </div>
              <input
                type="number"
                value={form.cooldownTicks}
                onChange={(e) => setForm((f) => ({ ...f, cooldownTicks: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-16 bg-elevated border border-border rounded-lg px-2 py-2.5 text-primary text-xs font-mono text-center focus:outline-none focus:border-accent min-h-[44px]"
                min={0}
              />
            </div>
            {form.conditions.some((c) => c.value !== "") && (
              <div className="bg-surface rounded-xl p-3">
                <p className="text-muted text-xs mb-1 uppercase tracking-wider">Preview</p>
                {form.conditions.filter((c) => c.value !== "").map((c, i) => (
                  <p key={i} className="text-secondary text-xs font-mono">{i === 0 ? "IF" : "AND"} {conditionSummary(c)}</p>
                ))}
                <p className="text-accent text-xs font-mono mt-0.5">THEN {actionSummary(form)}</p>
              </div>
            )}
            <Button onClick={saveCustomRule} className="w-full">Save Rule</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function StepReview({ launching }: { launching: boolean }) {
  const startingCapital = usePortfolioStore((s) => s.startingCapital);
  const scenario = usePortfolioStore((s) => s.scenario);
  const allocations = usePortfolioStore((s) => s.allocations);
  const rules = useRulesStore((s) => s.rules);
  const totalPct = allocations.reduce((s, a) => s + a.pct, 0);

  if (launching) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-48">
        <Spinner size="lg" />
        <p className="text-secondary text-sm">Loading historical data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Ready to lose money?</h2>
        <p className="text-secondary text-sm">Review your setup before launching.</p>
      </div>
      <div className="bg-elevated rounded-xl p-4">
        <p className="text-muted text-xs mb-1 uppercase tracking-wider font-mono">Capital</p>
        <p className="text-primary font-bold font-mono text-lg">{formatCurrency(startingCapital)}</p>
      </div>
      <div className="bg-elevated rounded-xl p-4">
        <p className="text-muted text-xs mb-1 uppercase tracking-wider font-mono">Scenario</p>
        {scenario ? (
          <>
            <p className="text-primary font-semibold">{scenario.name}</p>
            <p className="text-secondary text-xs mt-0.5">{scenario.startDate} to {scenario.endDate}</p>
          </>
        ) : (
          <p className="text-loss text-sm">No scenario selected</p>
        )}
      </div>
      <div className="bg-elevated rounded-xl p-4">
        <p className="text-muted text-xs mb-2 uppercase tracking-wider font-mono">Portfolio</p>
        {allocations.length === 0 ? (
          <p className="text-loss text-sm">No instruments selected</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {allocations.map((a) => (
              <div key={a.ticker} className="flex justify-between items-center">
                <span className="text-accent font-mono font-bold text-sm">{a.ticker}</span>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-mono text-sm">{a.pct.toFixed(1)}%</span>
                  <span className="text-muted text-xs w-20 text-right">
                    {formatCurrency((a.pct / 100) * startingCapital)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center border-t border-border pt-1.5 mt-0.5">
              <span className="text-secondary text-xs">Total</span>
              <span className={`font-mono text-sm font-semibold ${Math.abs(totalPct - 100) < 1.5 ? "text-gain" : "text-loss"}`}>
                {totalPct.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="bg-elevated rounded-xl p-4">
        <p className="text-muted text-xs mb-2 uppercase tracking-wider font-mono">Rules ({rules.length})</p>
        {rules.length === 0 ? (
          <p className="text-secondary text-xs">None — flying manual</p>
        ) : (
          <div className="flex flex-col gap-1">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rule.enabled ? "bg-gain" : "bg-border"}`} />
                <span className="text-secondary text-xs truncate">{rule.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);

  const scenario = usePortfolioStore((s) => s.scenario);
  const startingCapital = usePortfolioStore((s) => s.startingCapital);
  const allocations = usePortfolioStore((s) => s.allocations);
  const rules = useRulesStore((s) => s.rules);
  const initSimulation = useSimulationStore((s) => s.initSimulation);
  const submitTrade = useSimulationStore((s) => s.submitTrade);

  const canProceed = (): boolean => {
    if (step === 1) return !!scenario;
    if (step === 2) return allocations.length > 0;
    if (step === 4) return !!scenario && allocations.length > 0;
    return true;
  };

  const handleLaunch = async () => {
    if (!scenario || allocations.length === 0) return;
    setLaunching(true);
    try {
      const tickers = allocations.map((a) => a.ticker);
      const priceData = await loadPriceDataMap(tickers, scenario.slug);
      const config = {
        startingCapital,
        scenario,
        allocations,
        rules,
        mode: "movie" as const,
        granularity: "daily" as const,
      };
      initSimulation(config, priceData);
      allocations.forEach((alloc) => {
        submitTrade({
          ticker: alloc.ticker,
          action: "buy",
          amount: (alloc.pct / 100) * startingCapital,
          source: "manual",
        });
      });
      router.push("/simulate");
    } catch {
      setLaunching(false);
    }
  };

  const nextStep = () => {
    if (step === STEPS.length - 1) {
      void handleLaunch();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-secondary text-sm hover:text-primary transition-colors">
          Back
        </Link>
        <div className="flex-1 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
        <span className="text-xs text-secondary font-mono">{step + 1}/{STEPS.length}</span>
      </div>
      <p className="text-xs text-muted font-mono mb-4 uppercase tracking-widest">{STEPS[step]}</p>
      <div className="flex-1">
        {step === 0 && <StepCapital />}
        {step === 1 && <StepScenario />}
        {step === 2 && <StepPortfolio />}
        {step === 3 && <StepRules scenario={scenario} />}
        {step === 4 && <StepReview launching={launching} />}
      </div>
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1"
            disabled={launching}
          >
            Back
          </Button>
        )}
        <Button
          onClick={nextStep}
          className="flex-1"
          disabled={!canProceed() || launching}
        >
          {launching ? (
            <><Spinner size="sm" /> Loading...</>
          ) : step === STEPS.length - 1 ? (
            "Launch Simulation"
          ) : (
            "Next"
          )}
        </Button>
      </div>
    </main>
  );
}
