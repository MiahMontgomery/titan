import { QueryClientProvider } from "@tanstack/react-query";
import { Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/contexts/ProjectContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div style={{ color: 'red', padding: 24 }}>
      <p>Something went wrong. Please refresh the page.</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary} style={{ marginTop: 12 }}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
        <QueryClientProvider client={queryClient}>
          <ProjectProvider>
            <TooltipProvider>
              <Toaster />
              {/* Add more routes here as your app grows */}
              <Route path="/" component={Dashboard} />
              <Route component={NotFound} />
            </TooltipProvider>
          </ProjectProvider>
        </QueryClientProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
