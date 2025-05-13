import { QueryClientProvider } from "@tanstack/react-query";
import { Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/contexts/ProjectContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <TooltipProvider>
          <Toaster />
          <Route path="/" component={Dashboard} />
          <Route component={NotFound} />
        </TooltipProvider>
      </ProjectProvider>
    </QueryClientProvider>
  );
}

export default App;
