import React from 'react';
import { Route, Switch } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import PersonaManager from "@/pages/PersonaManager";
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ProjectProvider>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/personas" component={PersonaManager} />
              <Route path="/dashboard" component={Dashboard} />
            </Switch>
          </AppLayout>
          <Toaster />
        </ProjectProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
