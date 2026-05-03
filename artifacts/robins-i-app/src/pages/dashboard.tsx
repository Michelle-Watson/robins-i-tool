import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function riskColor(level?: string | null) {
  if (!level) return "bg-slate-100 text-slate-500";
  switch (level) {
    case "low": return "bg-green-100 text-green-800 border-green-200";
    case "low-except": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "moderate": return "bg-orange-100 text-orange-800 border-orange-200";
    case "serious": return "bg-red-100 text-red-800 border-red-200";
    case "critical": return "bg-stone-800 text-stone-100 border-stone-700";
    default: return "bg-slate-100 text-slate-800";
  }
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your systematic review progress.</p>
        </div>
        <Button asChild>
          <Link href="/studies">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Study
          </Link>
        </Button>
      </div>

      {isLoading || !summary ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Studies</CardTitle>
                <FileText className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalStudies}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Fully Assessed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.fullyAssessed}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {summary.totalStudies > 0 ? Math.round((summary.fullyAssessed / summary.totalStudies) * 100) : 0}% completion
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Critical Risk Found</CardTitle>
                <AlertTriangle className="h-4 w-4 text-stone-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.riskBreakdown.critical}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Studies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summary.recentStudies.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No studies found.
                      </div>
                    ) : (
                      summary.recentStudies.map(study => (
                        <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                          <div>
                            <Link href={`/studies/${study.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline">
                              {study.name}
                            </Link>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span>{study.assessedDomains} / {study.totalDomains} Domains</span>
                              <span>•</span>
                              <span>{new Date(study.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className={riskColor(study.worstOutcome)}>
                              {study.worstOutcome ? study.worstOutcome.toUpperCase() : "UNASSESSED"}
                            </Badge>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/studies/${study.id}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Risk Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Low Risk", value: summary.riskBreakdown.low, color: "bg-green-500" },
                      { label: "Low Except", value: summary.riskBreakdown.lowExcept, color: "bg-yellow-500" },
                      { label: "Moderate Risk", value: summary.riskBreakdown.moderate, color: "bg-orange-500" },
                      { label: "Serious Risk", value: summary.riskBreakdown.serious, color: "bg-red-500" },
                      { label: "Critical Risk", value: summary.riskBreakdown.critical, color: "bg-stone-800" },
                    ].map(item => {
                      const total = Object.values(summary.riskBreakdown).reduce((a,b)=>a+b,0) || 1;
                      const percent = (item.value / total) * 100;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="text-slate-500">{item.value}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
