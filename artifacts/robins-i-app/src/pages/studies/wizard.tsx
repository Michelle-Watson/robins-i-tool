import { useGetStudy, useUpsertAssessment, getGetStudyQueryKey, getListAssessmentsQueryKey } from "@workspace/api-client-react"; // eslint-disable-line
import { useLocation, useParams, Link } from "wouter";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// Import Graph Components
import Domain1AGraph from "@/components/domain-trees/Domain1AGraph";
import Domain1BGraph from "@/components/domain-trees/Domain1BGraph";
import Domain2Graph from "@/components/domain-trees/Domain2Graph";
import Domain3Graph from "@/components/domain-trees/Domain3Graph";
import Domain4Graph from "@/components/domain-trees/Domain4Graph";
import Domain5Graph from "@/components/domain-trees/Domain5Graph";
import Domain6Graph from "@/components/domain-trees/Domain6Graph";

type RiskLevel = "low" | "low-except" | "moderate" | "serious" | "critical";

export default function AssessmentWizard() {
  const { studyId, domainId } = useParams();
  const id = Number(studyId);
  const { data: study, isLoading } = useGetStudy(id, { query: { queryKey: getGetStudyQueryKey(id), enabled: !!id } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [outcome, setOutcome] = useState<RiskLevel | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const existingAssessment = study?.assessments?.find(a => a.domainId === domainId);

  const upsert = useUpsertAssessment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetStudyQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListAssessmentsQueryKey(id) });
        toast({ title: "Assessment saved successfully" });
        setLocation(`/studies/${id}`);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error saving", description: (err as any)?.response?.data?.error || "Failed to save assessment" });
      }
    }
  });

  const handleSave = () => {
    if (!outcome) {
      toast({ variant: "destructive", title: "Incomplete", description: "Please complete the decision tree to reach an outcome." });
      return;
    }
    upsert.mutate({
      studyId: id,
      domainId: domainId as any,
      data: { outcome, answers, notes }
    });
  };

  if (isLoading || !study) return <div className="p-8 text-slate-500">Loading...</div>;

  let GraphComponent = null;
  switch (domainId) {
    case "1a": GraphComponent = Domain1AGraph; break;
    case "1b": GraphComponent = Domain1BGraph; break;
    case "2": GraphComponent = Domain2Graph; break;
    case "3": GraphComponent = Domain3Graph; break;
    case "4": GraphComponent = Domain4Graph; break;
    case "5": GraphComponent = Domain5Graph; break;
    case "6": GraphComponent = Domain6Graph; break;
    default: return <div className="p-8 text-red-500">Invalid domain ID</div>;
  }

  // Wrapper to inject props into the copy-pasted graph components
  // Since we're copy-pasting the exact components, they don't natively expose `onOutcome` or `onAnswersChange` 
  // without modifying them. I will modify the copied files to accept these props.
  // Wait, I haven't copied them yet. I will do that in the next batch.

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none bg-white border-b px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href={`/studies/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{study.name}</h1>
            <p className="text-xs text-slate-500">Assessing Domain {domainId.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {outcome && (
            <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
              Current Outcome: {outcome.toUpperCase()}
            </span>
          )}
          <Button onClick={handleSave} disabled={!outcome || upsert.isPending} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4 mr-2" />
            Save Assessment
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative border-r">
          {/* Note: I'll need to modify the graph components to accept these props */}
          <GraphComponent 
            onOutcome={setOutcome} 
            onAnswersChange={setAnswers} 
            initialAnswers={existingAssessment?.answers || {}} 
          />
        </div>
        <div className="w-80 flex-none bg-slate-50 p-6 overflow-y-auto flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Assessor Notes</h3>
            <Textarea 
              placeholder="Record justifications, quotes from paper, or reasoning here..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[200px] resize-none text-sm bg-white"
            />
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Instructions</h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Click the answer options in the bottom panel of the graph to navigate the decision tree. The tree will highlight the active path and calculate the final risk of bias outcome automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
