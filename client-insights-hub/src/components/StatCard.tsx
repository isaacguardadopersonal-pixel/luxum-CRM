import { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: string;
  changeType?: "positive" | "negative";
  subtitle?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, change, changeType = "positive", subtitle, onClick }: StatCardProps) {
  return (
    <div 
      className={`stat-card animate-fade-in ${onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        {icon ? (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-2">
        {change && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            changeType === "positive"
              ? "bg-success/15 text-success"
              : "bg-destructive/15 text-destructive"
          }`}>
            {change}
          </span>
        )}
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
}
