import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectCard } from "@/components/ProjectCard";
import { ExpandedProject } from "@/components/ExpandedProject";
import { NewProjectModal } from "@/components/NewProjectModal";
import { TitanLogo } from "@/components/TitanLogo";
import { useProjectContext } from "@/contexts/ProjectContext";
import { PlusIcon } from "lucide-react";
import { AddTaskModal } from "@/components/AddTaskModal";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FolderOpen, 
  MessageSquare, 
  TrendingUp,
  Plus,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType, icon }: StatCardProps) {
  return (
    <Card className="hover:shadow-large transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {value}
            </p>
            <p className={`text-sm font-medium mt-1 ${
              changeType === 'positive' 
                ? 'text-success-600 dark:text-success-400' 
                : 'text-error-600 dark:text-error-400'
            }`}>
              {change}
            </p>
          </div>
          <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
            <div className="text-primary-600 dark:text-primary-400">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
}

function ActivityItem({ type, title, description, time }: ActivityItemProps) {
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-success-500" />,
    warning: <AlertCircle className="w-4 h-4 text-warning-500" />,
    info: <Activity className="w-4 h-4 text-primary-500" />
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-dark-tertiary transition-colors duration-200">
      <div className="mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {time}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { projects, isLoading, activeProjectId, setActiveProjectId, createNewProject } = useProjectContext();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [stats, setStats] = useState({
    personas: 12,
    projects: 8,
    messages: 156,
    growth: '+23%'
  });

  const recentActivity = [
    {
      type: 'success' as const,
      title: 'New persona created',
      description: 'Marketing Assistant persona has been successfully created',
      time: '2 minutes ago'
    },
    {
      type: 'info' as const,
      title: 'Task completed',
      description: 'Social media post scheduled for Tech Startup project',
      time: '15 minutes ago'
    },
    {
      type: 'warning' as const,
      title: 'Credential warning',
      description: 'Twitter API credentials need to be updated',
      time: '1 hour ago'
    },
    {
      type: 'success' as const,
      title: 'Project milestone',
      description: 'E-commerce project reached 75% completion',
      time: '2 hours ago'
    }
  ];

  const openNewProjectModal = () => setIsNewProjectModalOpen(true);
  const closeNewProjectModal = () => setIsNewProjectModalOpen(false);
  const openAddTaskModal = () => setIsAddTaskModalOpen(true);
  const closeAddTaskModal = () => setIsAddTaskModalOpen(false);

  // Find active project
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back! Here's what's happening with your PERSONAI system.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Personas"
          value={stats.personas}
          change="+2 this week"
          changeType="positive"
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="Active Projects"
          value={stats.projects}
          change="+1 this week"
          changeType="positive"
          icon={<FolderOpen className="w-6 h-6" />}
        />
        <StatCard
          title="Messages Sent"
          value={stats.messages}
          change="+45 this week"
          changeType="positive"
          icon={<MessageSquare className="w-6 h-6" />}
        />
        <StatCard
          title="Growth Rate"
          value={stats.growth}
          change="vs last month"
          changeType="positive"
          icon={<TrendingUp className="w-6 h-6" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates from your PERSONAI system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Persona
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  New Project
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current system health and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">API Status</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/20 text-success-800 dark:text-success-200">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/20 text-success-800 dark:text-success-200">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Queue</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/20 text-warning-800 dark:text-warning-200">
                    3 pending
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects list (horizontal scroll) */}
      <div className="flex overflow-x-auto pb-4 mb-8 hide-scrollbar gap-4 min-h-[80px]">
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-20">
            <div className="text-[#A9A9A9]">Loading projects...</div>
          </div>
        ) : (
          projects.length > 0 ? (
            projects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                isActive={project.id === activeProjectId}
                onClick={() => setActiveProjectId(project.id)}
              />
            ))
          ) : null
        )}
      </div>

      {/* Selected project expanded view */}
      <AnimatePresence>
        {activeProject && (
          <motion.div
            key="expanded-project"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ExpandedProject 
              project={activeProject} 
              onClose={() => setActiveProjectId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state message */}
      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-[#A9A9A9] text-xl mb-4">
            No projects yet. Click "Add New Project" to begin.
          </p>
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal 
        isOpen={isNewProjectModalOpen} 
        onClose={closeNewProjectModal}
        onSubmit={createNewProject}
      />
      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={closeAddTaskModal}
        defaultProjectId={activeProjectId ? String(activeProjectId) : ''}
      />
    </div>
  );
}
