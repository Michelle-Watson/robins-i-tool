import { useListStudies, useCreateStudy, getListStudiesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

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

export default function StudiesList() {
  const { data: studies, isLoading } = useListStudies();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const createStudy = useCreateStudy({
    mutation: {
      onSuccess: (study) => {
        queryClient.invalidateQueries({ queryKey: getListStudiesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setOpen(false);
        setLocation(`/studies/${study.id}`);
        toast({ title: "Study created", description: "You can now start the assessment." });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: (err as any)?.response?.data?.error || "Failed to create study" });
      }
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const desc = fd.get("description") as string;
    const variant = fd.get("variant") as "itt" | "per-protocol";
    createStudy.mutate({ data: { name, description: desc, domain1Variant: variant } });
  };

  const filtered = studies?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Studies</h1>
          <p className="text-slate-500 mt-1">Manage and assess your research studies.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Study
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Study</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Study Name / Citation</Label>
                <Input id="name" name="name" required placeholder="e.g. Smith et al. 2022" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" name="description" placeholder="Brief notes about this study..." />
              </div>
              <div className="space-y-3">
                <Label>Domain 1 Variant</Label>
                <RadioGroup defaultValue="itt" name="variant" className="space-y-3">
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <RadioGroupItem value="itt" id="itt" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="itt" className="font-semibold cursor-pointer">Intention-to-treat (ITT)</Label>
                      <p className="text-xs text-slate-500">Variant A: Use when assessing the effect of assignment to intervention.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <RadioGroupItem value="per-protocol" id="per-protocol" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="per-protocol" className="font-semibold cursor-pointer">Per-protocol</Label>
                      <p className="text-xs text-slate-500">Variant B: Use when assessing the effect of starting and adhering to intervention.</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createStudy.isPending}>
                  {createStudy.isPending ? "Creating..." : "Create Study"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search studies..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 max-w-md bg-white" 
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border rounded-xl bg-white border-dashed">
            No studies found matching "{search}"
          </div>
        ) : (
          filtered?.map(study => (
            <Card key={study.id} className="transition-all hover:shadow-md">
              <CardContent className="p-0">
                <Link href={`/studies/${study.id}`} className="block p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600">
                        {study.name}
                      </h3>
                      {study.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2 max-w-3xl">
                          {study.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {study.domain1Variant === 'itt' ? 'ITT' : 'Per-protocol'}
                        </span>
                        <span>Progress: {study.assessedDomains} / {study.totalDomains}</span>
                        <span>Added: {new Date(study.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={riskColor(study.worstOutcome)}>
                        {study.worstOutcome ? study.worstOutcome.toUpperCase() : "UNASSESSED"}
                      </Badge>
                      {study.worstOutcome && (
                        <span className="text-xs text-slate-400">Worst outcome</span>
                      )}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
