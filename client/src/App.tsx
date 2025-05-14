import { QueryClientProvider } from "@tanstack/react-query";
import { Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { initializeElevenLabsWidget } from "@/lib/elevenlabs";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";

function App() {
  useEffect(() => {
    // Initialize ElevenLabs widget when the app loads
    initializeElevenLabsWidget();
  }, []);

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
