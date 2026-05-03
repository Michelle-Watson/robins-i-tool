import { useGetStudy, useDeleteStudy, getListStudiesQueryKey, getGetStudyQueryKey } from "@workspace/api-client-react";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Edit, AlertCircle, PlayCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const DOMAINS = [
  { id: "1", prefix: "1", name: "Confounding" },
  { id: "2", prefix: "2", name: "Selection of participants" },
  { id: "3", prefix: "3", name: "Classification of interventions" },
  { id: "4", prefix: "4", name: "Deviations from intended interventions" },
  { id: "5", prefix: "5", name: "Missing outcome data" },
  { id: "6", prefix: "6", name: "Measurement of outcomes" },
];

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

export default function StudyDetail() {
  const { studyId } = useParams();
  const id = Number(studyId);
  const { data: study, isLoading } = useGetStudy(id, { query: { queryKey: getGetStudyQueryKey(id), enabled: !!id } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const deleteStudy = useDeleteStudy({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudiesQueryKey() });
        toast({ title: "Study deleted" });
        setLocation("/studies");
      }
    }
  });

  if (isLoading || !study) {
    return <div className="p-8"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  const assessmentsByDomain = Object.fromEntries(
    study.assessments.map(a => [a.domainId.startsWith('1') ? '1' : a.domainId, a])
  );

  const getDomainId = (dId: string) => {
    if (dId === "1") return study.domain1Variant === "itt" ? "1a" : "1b";
    return dId;
  };

  const isComplete = study.assessments.length === 6;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <Link href="/studies" className="flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Studies
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">{study.name}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Badge variant="secondary">
              {study.domain1Variant === 'itt' ? 'Intention-to-treat (ITT)' : 'Per-protocol'}
            </Badge>
            <span>Added {new Date(study.createdAt).toLocaleDateString()}</span>
          </div>
          {study.description && <p className="text-slate-600 mt-4 max-w-3xl">{study.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-700">
              <Link href={`/studies/${id}/results`}>
                View Results Summary
              </Link>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this study and all its assessments. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteStudy.mutate({ studyId: id })} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 border-b pb-2">Domain Assessments</h2>
        
        <div className="grid gap-4">
          {DOMAINS.map(domain => {
            const actualId = getDomainId(domain.id);
            const assessment = assessmentsByDomain[domain.id];
            
            return (
              <Card key={domain.id} className={`overflow-hidden transition-colors ${assessment ? 'border-l-4 border-l-slate-300' : 'border-l-4 border-l-indigo-500'}`}>
                <div className="flex items-center justify-between p-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-400">Domain {domain.id}</span>
                      <h3 className="text-lg font-medium text-slate-900">{domain.name}</h3>
                    </div>
                    {assessment && assessment.notes && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {assessment.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 ml-4">
                    {assessment ? (
                      <Badge variant="outline" className={`px-3 py-1 text-xs uppercase tracking-wider ${riskColor(assessment.outcome)}`}>
                        {assessment.outcome === 'low-except' ? 'LOW*' : assessment.outcome}
                      </Badge>
                    ) : (
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> Pending
                      </span>
                    )}
                    
                    <Button variant={assessment ? "secondary" : "default"} asChild size="sm">
                      <Link href={`/studies/${id}/assess/${actualId}`}>
                        {assessment ? (
                          <><Edit className="h-4 w-4 mr-2" /> Edit</>
                        ) : (
                          <><PlayCircle className="h-4 w-4 mr-2" /> Assess</>
                        )}
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
