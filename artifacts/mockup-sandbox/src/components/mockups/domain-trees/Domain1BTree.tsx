import { useState } from "react";

type RiskLevel = "low" | "low-except" | "moderate" | "serious" | "critical";

interface Answers {
  q1_1: string | null;
  q1_2: string | null;
  q1_3: string | null;
  q1_4: string | null;
  q1_5: string | null;
}

const empty: Answers = {
  q1_1: null, q1_2: null, q1_3: null, q1_4: null, q1_5: null,
};

const RISK_STYLE: Record<RiskLevel, string> = {
  low: "bg-green-500 border-green-700 text-white",
  "low-except": "bg-yellow-300 border-yellow-600 text-yellow-900",
  moderate: "bg-orange-300 border-orange-600 text-orange-900",
  serious: "bg-red-500 border-red-700 text-white",
  critical: "bg-black border-black text-white",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "LOW RISK OF BIAS",
  "low-except": "LOW RISK OF BIAS\nexcept for concerns about\nuncontrolled confounding",
  moderate: "MODERATE\nRISK OF BIAS",
  serious: "SERIOUS\nRISK OF BIAS",
  critical: "CRITICAL\nRISK OF BIAS",
};

function computeJudgement(a: Answers): RiskLevel | null {
  if (!a.q1_1) return null;

  // Path 1: 1.1 = Y/PY → check 1.2 → 1.3 → 1.5
  if (a.q1_1 === "Y/PY") {
    if (!a.q1_2) return null;

    if (a.q1_2 === "Y/PY") {
      if (!a.q1_3) return null;
      if (a.q1_3 === "Y/PY") {
        // 1.3=Y/PY → 1.5
        if (!a.q1_5) return null;
        return a.q1_5 === "N/PN" ? "low" : "serious";
      }
      // 1.3=SN/NI → 1.5
      if (!a.q1_5) return null;
      return a.q1_5 === "N/PN" ? "low-except" : "serious";
    }

    if (a.q1_2 === "WN") {
      if (!a.q1_3) return null;
      if (a.q1_3 === "SN/NI") return "serious";
      // 1.3=Y/PY/WN → 1.5
      if (!a.q1_5) return null;
      return a.q1_5 === "N/PN" ? "low-except" : "moderate";
    }

    // 1.2=SN/NI → 1.5
    if (!a.q1_5) return null;
    return a.q1_5 === "N/PN" ? "serious" : "serious";
  }

  // Path 2: 1.1 = N/PN/NI → 1.4
  if (a.q1_1 === "N/PN/NI") {
    if (!a.q1_4) return null;
    if (a.q1_4 === "Y/PY") return "critical";
    // 1.4=N/PN/NI → 1.5
    if (!a.q1_5) return null;
    return a.q1_5 === "N/PN" ? "serious" : "critical";
  }

  return null;
}

function getActiveQuestions(a: Answers) {
  const q1_2Active = a.q1_1 === "Y/PY";
  const q1_2NA = a.q1_1 === "N/PN/NI";

  const q1_3Active =
    a.q1_1 === "Y/PY" && !!a.q1_2 && a.q1_2 !== "SN/NI";
  const q1_3NA =
    a.q1_1 === "N/PN/NI" ||
    (a.q1_1 === "Y/PY" && a.q1_2 === "SN/NI");

  const q1_4Active = a.q1_1 === "N/PN/NI";
  const q1_4NA = a.q1_1 === "Y/PY";

  const q1_5Active =
    // Y/PY path: 1.2=Y/PY+1.3 answered, OR 1.2=WN+1.3≠SN/NI, OR 1.2=SN/NI
    (a.q1_1 === "Y/PY" && a.q1_2 === "Y/PY" && !!a.q1_3) ||
    (a.q1_1 === "Y/PY" && a.q1_2 === "WN" && !!a.q1_3 && a.q1_3 !== "SN/NI") ||
    (a.q1_1 === "Y/PY" && a.q1_2 === "SN/NI") ||
    // N/PN/NI path: 1.4=N/PN/NI
    (a.q1_1 === "N/PN/NI" && a.q1_4 === "N/PN/NI");

  const q1_5NA =
    (a.q1_1 === "Y/PY" && a.q1_2 === "WN" && a.q1_3 === "SN/NI") ||
    (a.q1_1 === "N/PN/NI" && a.q1_4 === "Y/PY");

  return { q1_2: { active: q1_2Active, na: q1_2NA },
    q1_3: { active: q1_3Active, na: q1_3NA },
    q1_4: { active: q1_4Active, na: q1_4NA },
    q1_5: { active: q1_5Active, na: q1_5NA },
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
          {na ? (
            <span className="italic text-gray-400">N/A – not applicable based on prior answer</span>
          ) : (
            text
          )}
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
        <p className="mt-2 text-xs italic text-gray-400">Answer prior questions first</p>
      )}
    </div>
  );
}

export function Domain1BTree() {
  const [answers, setAnswers] = useState<Answers>(empty);
  const states = getActiveQuestions(answers);
  const judgement = computeJudgement(answers);

  const set = (key: keyof Answers) => (val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "q1_1") return { ...empty, q1_1: val };
      if (key === "q1_2") return { ...next, q1_3: null, q1_5: null };
      if (key === "q1_3") return { ...next, q1_5: null };
      if (key === "q1_4") return { ...next, q1_5: null };
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-2xl bg-slate-800 px-6 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Domain 1 — Confounding</p>
          <h1 className="mt-1 text-xl font-bold">Variant B — Per-protocol</h1>
          <p className="mt-1 text-sm text-slate-300">
            Used when C4 = Yes (effects of assignment to intervention analysed)
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

        {/* IMPORTANT correction note */}
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs font-semibold text-blue-700">
            ⚠ Correction confirmed: CRITICAL is only reachable when 1.1 = N/PN/NI.
            The path 1.1=Y/PY → 1.2 → 1.3 → 1.5 can reach at most SERIOUS.
          </p>
        </div>

        <div className="space-y-3">
          {/* Q1.1 */}
          <QuestionBox
            number="1.1"
            text="Did the authors use an analysis method that was appropriate to control for time-varying as well as baseline confounding?"
            options={["Y/PY", "N/PN/NI"]}
            value={answers.q1_1}
            onChange={set("q1_1")}
            active={true}
            na={false}
          />

          {/* Q1.2 — only for 1.1=Y/PY */}
          <QuestionBox
            number="1.2"
            text="Did the authors control for all the important baseline and time-varying confounding factors for which this was necessary?"
            options={["Y/PY", "WN", "SN/NI"]}
            value={answers.q1_2}
            onChange={set("q1_2")}
            active={states.q1_2.active}
            na={states.q1_2.na}
            hidden={!answers.q1_1}
          />

          {/* Q1.3 — only for 1.1=Y/PY and 1.2≠SN/NI */}
          <QuestionBox
            number="1.3"
            text="Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?"
            options={["Y/PY", "SN/NI"]}
            value={answers.q1_3}
            onChange={set("q1_3")}
            active={states.q1_3.active}
            na={states.q1_3.na}
            hidden={!answers.q1_2 && !states.q1_3.na}
          />

          {/* Q1.4 — only for 1.1=N/PN/NI */}
          <QuestionBox
            number="1.4"
            text="Did the authors control for time-varying factors or other variables measured after the start of intervention?"
            options={["Y/PY", "N/PN/NI"]}
            value={answers.q1_4}
            onChange={set("q1_4")}
            active={states.q1_4.active}
            na={states.q1_4.na}
            hidden={!answers.q1_1}
          />

          {/* Q1.5 */}
          <QuestionBox
            number="1.5"
            text="Did the use of negative controls, or other considerations, suggest serious uncontrolled confounding?"
            options={["Y/PY", "N/PN"]}
            value={answers.q1_5}
            onChange={set("q1_5")}
            active={states.q1_5.active}
            na={states.q1_5.na}
            hidden={
              !states.q1_5.active && !states.q1_5.na &&
              !(answers.q1_2 || answers.q1_4)
            }
          />
        </div>

        {/* Judgement */}
        {judgement && (
          <div className={`mt-6 rounded-2xl border-2 p-6 text-center ${RISK_STYLE[judgement]}`}>
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
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Algorithm Summary (Domain 1B)</p>
          <div className="space-y-1 font-mono text-xs text-slate-600">
            <p className="font-semibold text-slate-700">1.1 = Y/PY (appropriate analysis):</p>
            <p className="pl-4">→ 1.2=Y/PY → 1.3=Y/PY → 1.5: N/PN: <span className="text-green-700 font-bold">LOW</span> | Y/PY: <span className="text-red-600 font-bold">SERIOUS</span></p>
            <p className="pl-4">→ 1.2=Y/PY → 1.3=SN/NI → 1.5: N/PN: <span className="text-yellow-700 font-bold">LOW*</span> | Y/PY: <span className="text-red-600 font-bold">SERIOUS</span></p>
            <p className="pl-4">→ 1.2=WN → 1.3=Y/PY/WN → 1.5: N/PN: <span className="text-yellow-700 font-bold">LOW*</span> | Y/PY: <span className="text-orange-600 font-bold">MODERATE</span></p>
            <p className="pl-4">→ 1.2=WN → 1.3=SN/NI → <span className="text-red-600 font-bold">SERIOUS</span> (direct)</p>
            <p className="pl-4">→ 1.2=SN/NI → 1.5: N/PN: <span className="text-red-600 font-bold">SERIOUS</span> | Y/PY: <span className="text-red-600 font-bold">SERIOUS</span></p>
            <p className="mt-2 font-semibold text-slate-700">1.1 = N/PN/NI (inappropriate analysis):</p>
            <p className="pl-4">→ 1.4=Y/PY → <span className="font-bold text-black">CRITICAL</span></p>
            <p className="pl-4">→ 1.4=N/PN/NI → 1.5: N/PN: <span className="text-red-600 font-bold">SERIOUS</span> | Y/PY: <span className="font-bold text-black">CRITICAL</span></p>
          </div>
          <p className="mt-2 text-xs italic text-slate-400">*LOW = "LOW RISK OF BIAS except for concerns about uncontrolled confounding"</p>
          <p className="mt-1 text-xs font-semibold text-blue-600">✓ CRITICAL is only reachable via 1.1 = N/PN/NI</p>
        </div>
      </div>
    </div>
  );
}
