import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { MessageSquare, FileText, DollarSign } from "lucide-react";
import { getSalesByProject, getProjectPerformance } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Sale } from "@shared/schema";

interface SalesTabProps {
  projectId: number;
}

export function SalesTab({ projectId }: SalesTabProps) {
  // Get performance metrics
  const { data: performance, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'performance'],
    enabled: !!projectId,
  });

  // Get sales activity
  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'sales'],
    enabled: !!projectId,
  });

  const isLoading = isPerformanceLoading || isSalesLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert cents to dollars
  };

  if (isLoading) {
    return (
      <div className="p-4 max-h-[600px] overflow-y-auto">
        <div className="sales-header mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[600px] overflow-y-auto">
      <div className="sales-header mb-4">
        <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
        <p className="text-sm text-[#A9A9A9]">Yesterday's performance</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card p-4 bg-[#0d0d0d] rounded-md border border-[#333333]">
          <div className="flex items-center mb-2">
            <MessageSquare size={16} className="text-[#A9A9A9] mr-2" />
            <div className="text-[#A9A9A9] text-sm">Messages</div>
          </div>
          <div className="text-2xl font-semibold text-white">
            {performance?.messages || 0}
          </div>
        </div>
        
        <div className="stat-card p-4 bg-[#0d0d0d] rounded-md border border-[#333333]">
          <div className="flex items-center mb-2">
            <FileText size={16} className="text-[#A9A9A9] mr-2" />
            <div className="text-[#A9A9A9] text-sm">Content Created</div>
          </div>
          <div className="text-2xl font-semibold text-white">
            {performance?.content || 0}
          </div>
        </div>
        
        <div className="stat-card p-4 bg-[#0d0d0d] rounded-md border border-[#333333]">
          <div className="flex items-center mb-2">
            <DollarSign size={16} className="text-[#A9A9A9] mr-2" />
            <div className="text-[#A9A9A9] text-sm">Income Earned</div>
          </div>
          <div className="text-2xl font-semibold text-white">
            {performance?.income ? formatCurrency(performance.income) : '$0'}
          </div>
        </div>
      </div>
      
      <div className="sales-log">
        <h4 className="text-md font-medium mb-3 text-white">Sales Activity</h4>
        <div className="sales-log-container space-y-2">
          {sales.length === 0 ? (
            <div className="text-center text-[#A9A9A9] py-4">
              No sales activity yet. Revenue will be tracked here.
            </div>
          ) : (
            sales
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((sale) => (
                <SaleItem key={sale.id} sale={sale} />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

interface SaleItemProps {
  sale: Sale;
}

function SaleItem({ sale }: SaleItemProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert cents to dollars
  };

  const getActivityText = () => {
    const amount = formatCurrency(sale.amount);
    const platform = sale.platform ? ` via ${sale.platform}` : '';
    
    if (sale.quantity > 1) {
      return `Sold ${sale.quantity} ${sale.type}s for ${amount}${platform}`;
    } else {
      return `Sold 1 ${sale.type} for ${amount}${platform}`;
    }
  };

  return (
    <div className="p-3 bg-[#0d0d0d] border border-[#333333] rounded-md">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <DollarSign size={16} className="text-green-400 mr-2" />
          <span className="text-white">{getActivityText()}</span>
        </div>
        <div className="text-xs text-[#A9A9A9]">
          {format(new Date(sale.timestamp), 'MMM d, h:mm a')}
        </div>
      </div>
    </div>
  );
}
