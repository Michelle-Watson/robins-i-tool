import { useGetStudy, getGetStudyQueryKey } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function riskColor(level?: string) {
  if (!level) return "bg-slate-100 text-slate-500 border-slate-200";
  switch (level) {
    case "low": return "bg-green-100 text-green-800 border-green-200";
    case "low-except": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "moderate": return "bg-orange-100 text-orange-800 border-orange-200";
    case "serious": return "bg-red-100 text-red-800 border-red-200";
    case "critical": return "bg-stone-800 text-stone-100 border-stone-700";
    default: return "bg-slate-100 text-slate-800";
  }
}

const DOMAINS = [
  { id: "1", name: "Confounding" },
  { id: "2", name: "Selection of participants" },
  { id: "3", name: "Classification of interventions" },
  { id: "4", name: "Deviations from intended interventions" },
  { id: "5", name: "Missing outcome data" },
  { id: "6", name: "Measurement of outcomes" },
];

export default function StudyResults() {
  const { studyId } = useParams();
  const id = Number(studyId);
  const { data: study, isLoading } = useGetStudy(id, { query: { queryKey: getGetStudyQueryKey(id), enabled: !!id } });

  if (isLoading || !study) return <div className="p-8"><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const assessmentsByDomain = Object.fromEntries(
    study.assessments.map(a => [a.domainId.startsWith('1') ? '1' : a.domainId, a])
  );

  const getWorstOutcome = () => {
    const levels = study.assessments.map(a => a.outcome);
    if (levels.includes("critical")) return "critical";
    if (levels.includes("serious")) return "serious";
    if (levels.includes("moderate")) return "moderate";
    if (levels.includes("low-except")) return "low-except";
    if (levels.includes("low")) return "low";
    return null;
  };

  const worst = getWorstOutcome();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-white print:p-0 print:m-0 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/studies/${id}`} className="flex items-center text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Study
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4 border-b pb-8">
        <h1 className="text-3xl font-bold text-slate-900">{study.name}</h1>
        {study.description && <p className="text-slate-600">{study.description}</p>}
        
        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Overall Risk of Bias</h2>
          <div className={`inline-block px-4 py-2 rounded-md font-bold text-lg border ${riskColor(worst || undefined)}`}>
            {worst ? worst.toUpperCase() : "INCOMPLETE"}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-xl font-bold text-slate-900">Domain Breakdown</h2>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
              <tr>
                <th className="px-6 py-4 w-1/3">Domain</th>
                <th className="px-6 py-4 w-1/4">Risk of Bias</th>
                <th className="px-6 py-4">Assessor Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DOMAINS.map(domain => {
                const assessment = assessmentsByDomain[domain.id];
                return (
                  <tr key={domain.id} className="bg-white">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      Domain {domain.id}: {domain.name}
                    </td>
                    <td className="px-6 py-4">
                      {assessment ? (
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border ${riskColor(assessment.outcome)}`}>
                          {assessment.outcome === 'low-except' ? 'LOW*' : assessment.outcome.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not assessed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-pre-wrap">
                      {assessment?.notes || <span className="text-slate-400 italic">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
