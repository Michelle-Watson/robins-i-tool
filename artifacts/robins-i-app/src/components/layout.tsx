import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, FileText } from "lucide-react";
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarRail, SidebarInset } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden w-full">
        <Sidebar className="border-r border-border/50 bg-slate-50/50">
          <SidebarHeader className="h-16 px-4 flex items-center border-b border-border/50">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Activity className="h-5 w-5 text-indigo-600" />
              <span>ROBINS-I V2</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/"}>
                    <Link href="/">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/studies")}>
                    <Link href="/studies">
                      <FileText className="h-4 w-4" />
                      <span>Studies</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex-1 overflow-auto bg-slate-50/30">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
