import { useState } from "react";

type RiskLevel = "low-except" | "moderate" | "serious" | "critical";

interface Answers {
  q1_1: string | null;
  q1_3: string | null;
  q1_2: string | null;
  q1_4: string | null;
  q1_2_bot: string | null;
}

const empty: Answers = {
  q1_1: null, q1_3: null, q1_2: null, q1_4: null, q1_2_bot: null,
};

const RISK_STYLE: Record<RiskLevel, string> = {
  "low-except": "bg-yellow-300 border-yellow-600 text-yellow-900",
  moderate: "bg-orange-300 border-orange-600 text-orange-900",
  serious: "bg-red-500 border-red-700 text-white",
  critical: "bg-black border-black text-white",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  "low-except": "LOW RISK OF BIAS\nexcept for concerns about\nuncontrolled confounding",
  moderate: "MODERATE\nRISK OF BIAS",
  serious: "SERIOUS\nRISK OF BIAS",
  critical: "CRITICAL\nRISK OF BIAS",
};

function computeJudgement(a: Answers): RiskLevel | null {
  if (!a.q1_1) return null;

  if (a.q1_1 === "Y/PY") {
    if (!a.q1_3) return null;
    if (a.q1_3 === "Y/PY") {
      if (!a.q1_4) return null;
      return a.q1_4 === "N/PN" ? "low-except" : "serious";
    }
    // N/PN/NI → need 1.2 then 1.4
    if (!a.q1_2) return null;
    if (!a.q1_4) return null;
    return a.q1_4 === "N/PN" ? "low-except" : "serious";
  }

  if (a.q1_1 === "WN") {
    if (!a.q1_3) return null;
    if (!a.q1_2) return null;
    if (a.q1_2 === "SN/NI") return "serious";
    if (!a.q1_4) return null;
    return a.q1_4 === "N/PN" ? "moderate" : "serious";
  }

  // SN/NI
  if (!a.q1_4) return null;
  if (a.q1_4 === "Y/PY") return "critical";
  if (!a.q1_2_bot) return null;
  return a.q1_2_bot === "Y/PY" ? "serious" : "critical";
}

function getActiveQuestions(a: Answers) {
  const q1_3Active = a.q1_1 === "Y/PY" || a.q1_1 === "WN";
  const q1_3NA = a.q1_1 === "SN/NI";

  const q1_2Active =
    (a.q1_1 === "Y/PY" && a.q1_3 === "N/PN/NI") ||
    (a.q1_1 === "WN" && !!a.q1_3);
  const q1_2NA =
    a.q1_1 === "SN/NI" ||
    (a.q1_1 === "Y/PY" && a.q1_3 === "Y/PY");

  const q1_4Active =
    (a.q1_1 === "Y/PY" && a.q1_3 === "Y/PY") ||
    (a.q1_1 === "Y/PY" && a.q1_3 === "N/PN/NI" && !!a.q1_2) ||
    (a.q1_1 === "WN" && !!a.q1_2 && a.q1_2 !== "SN/NI");
  const q1_4NA = a.q1_1 === "SN/NI" || (a.q1_1 === "WN" && a.q1_2 === "SN/NI");

  const q1_4SNIActive = a.q1_1 === "SN/NI";
  const q1_2BotActive = a.q1_1 === "SN/NI" && a.q1_4 === "N/PN";
  const q1_2BotNA = a.q1_1 === "SN/NI" && a.q1_4 === "Y/PY";

  return {
    q1_3: { active: q1_3Active, na: q1_3NA },
    q1_2: { active: q1_2Active, na: q1_2NA },
    q1_4: { active: q1_4Active, na: q1_4NA },
    q1_4SNI: { active: q1_4SNIActive },
    q1_2Bot: { active: q1_2BotActive, na: q1_2BotNA },
  };
}

function QuestionBox({
  number, text, options, value, onChange, active, na, hidden,
}: {
  number: string; text: string; options: string[]; value: string | null;
  onChange: (v: string) => void; active: boolean; na: boolean; hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        na
          ? "border-gray-200 bg-gray-50 opacity-50"
          : active
          ? "border-blue-400 bg-white shadow-md"
          : "border-gray-200 bg-gray-50 opacity-40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-white">
          {number}
        </span>
        <p className={`text-sm leading-snug ${na ? "text-gray-400" : "text-gray-800"}`}>
          {na ? <span className="italic text-gray-400">N/A – not applicable based on prior answer</span> : text}
        </p>
      </div>
      {!na && active && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                value === opt
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {!na && !active && (
        <p className="mt-2 text-xs text-gray-400 italic">Answer prior questions first</p>
      )}
    </div>
  );
}

export function Domain1ATree() {
  const [answers, setAnswers] = useState<Answers>(empty);
  const states = getActiveQuestions(answers);
  const judgement = computeJudgement(answers);

  const set = (key: keyof Answers) => (val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: val };
      // Reset downstream answers when an upstream answer changes
      if (key === "q1_1") return { ...empty, q1_1: val };
      if (key === "q1_3") return { ...next, q1_2: null, q1_4: null };
      if (key === "q1_2") return { ...next, q1_4: null };
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-2xl bg-slate-800 px-6 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Domain 1 — Confounding</p>
          <h1 className="mt-1 text-xl font-bold">Variant A — Intention-to-treat</h1>
          <p className="mt-1 text-sm text-slate-300">
            Used when C4 = No (no deviation from intended intervention analysed)
          </p>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Decision Path Tracer
          </p>
          <button
            onClick={() => setAnswers(empty)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            Reset
          </button>
        </div>

        <div className="space-y-3">
          {/* Q1.1 — always active */}
          <QuestionBox
            number="1.1"
            text="Did the authors control for all the important confounding factors for which this was necessary?"
            options={["Y/PY", "WN", "SN/NI"]}
            value={answers.q1_1}
            onChange={set("q1_1")}
            active={true}
            na={false}
          />

          {/* Q1.3 — only for Y/PY or WN from 1.1 */}
          <QuestionBox
            number="1.3"
            text="Did the authors control for any post-intervention variables that could have been affected by the intervention?"
            options={["Y/PY", "N/PN/NI"]}
            value={answers.q1_3}
            onChange={set("q1_3")}
            active={states.q1_3.active}
            na={states.q1_3.na}
            hidden={!answers.q1_1}
          />

          {/* Q1.2 — conditional on 1.3 answer (or N/A when 1.3=Y/PY on Y/PY path) */}
          <QuestionBox
            number="1.2"
            text="Were confounding factors that were controlled for measured validly and reliably by the variables available in this study?"
            options={answers.q1_1 === "WN" ? ["Y/PY", "WN", "SN/NI"] : ["WN", "SN/NI"]}
            value={answers.q1_2}
            onChange={set("q1_2")}
            active={states.q1_2.active}
            na={states.q1_2.na}
            hidden={!answers.q1_3 && !states.q1_2.na}
          />

          {/* Q1.4 — appears in UPPER paths (Y/PY and WN) */}
          <QuestionBox
            number="1.4"
            text="Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?"
            options={["Y/PY", "N/PN"]}
            value={answers.q1_4}
            onChange={set("q1_4")}
            active={states.q1_4.active && !states.q1_4SFI?.active}
            na={states.q1_4.na}
            hidden={
              answers.q1_1 === "SN/NI" ||
              (!states.q1_4.active && !states.q1_4.na && !answers.q1_4)
            }
          />

          {/* ── SN/NI BOTTOM PATH ── */}
          {answers.q1_1 === "SN/NI" && (
            <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-red-600">
                Path: 1.1 = SN/NI (serious/no control for confounders)
              </p>
              <div className="space-y-3">
                <QuestionBox
                  number="1.4"
                  text="Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?"
                  options={["Y/PY", "N/PN"]}
                  value={answers.q1_4}
                  onChange={set("q1_4")}
                  active={true}
                  na={false}
                />
                <QuestionBox
                  number="1.2"
                  text="Were confounding factors that were controlled for measured validly and reliably by the variables available in this study?"
                  options={["Y/PY", "SN/WN/NI"]}
                  value={answers.q1_2_bot}
                  onChange={(v) => setAnswers((p) => ({ ...p, q1_2_bot: v }))}
                  active={states.q1_2Bot.active}
                  na={states.q1_2Bot.na}
                  hidden={!answers.q1_4}
                />
              </div>
            </div>
          )}
        </div>

        {/* Judgement */}
        {judgement && (
          <div
            className={`mt-6 rounded-2xl border-2 p-6 text-center ${RISK_STYLE[judgement]}`}
          >
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Domain 1 Judgement</p>
            <p className="mt-2 whitespace-pre-line text-lg font-extrabold leading-snug">
              {RISK_LABEL[judgement]}
            </p>
          </div>
        )}

        {!judgement && answers.q1_1 && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            Answer all active questions above to see the judgement
          </div>
        )}

        {/* Algorithm Key */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Algorithm Summary (Domain 1A)</p>
          <div className="space-y-1 font-mono text-xs text-slate-600">
            <p className="font-semibold text-slate-700">1.1 = Y/PY:</p>
            <p className="pl-4">→ 1.3 = Y/PY → 1.4 → N/PN: <span className="text-yellow-700 font-bold">LOW*</span> | Y/PY: <span className="text-red-600 font-bold">SERIOUS</span></p>
            <p className="pl-4">→ 1.3 = N/PN/NI → 1.2 → 1.4 → N/PN: <span className="text-yellow-700 font-bold">LOW*</span> | Y/PY: <span className="text-red-600 font-bold">SERIOUS</span></p>
            <p className="mt-2 font-semibold text-slate-700">1.1 = WN:</p>
            <p className="pl-4">→ 1.3 → 1.2 = SN/NI → <span className="text-red-600 font-bold">SERIOUS</span> (direct)</p>
            <p className="pl-4">→ 1.3 → 1.2 = Y/PY/WN → 1.4 → N/PN: <span className="text-orange-600 font-bold">MODERATE</span> | Y/PY: <span className="text-red-600 font-bold">SERIOUS</span></p>
            <p className="mt-2 font-semibold text-slate-700">1.1 = SN/NI:</p>
            <p className="pl-4">→ 1.4 = Y/PY → <span className="font-bold text-black">CRITICAL</span></p>
            <p className="pl-4">→ 1.4 = N/PN → 1.2 = Y/PY: <span className="text-red-600 font-bold">SERIOUS</span> | SN/WN/NI: <span className="font-bold text-black">CRITICAL</span></p>
          </div>
          <p className="mt-2 text-xs italic text-slate-400">*LOW = "LOW RISK OF BIAS except for concerns about uncontrolled confounding"</p>
        </div>
      </div>
    </div>
  );
}
