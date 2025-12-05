import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
    change?: number; // The numeric change value for detecting zero
  };
  onClick?: () => void;
}

export const StatsCard = ({ title, value, description, icon: Icon, trend, onClick }: StatsCardProps) => {
  // Determine trend display based on change value
  const getTrendDisplay = () => {
    if (!trend) return null;
    
    // If change is 0, show neutral (grey, no arrow)
    if (trend.change === 0) {
      return (
        <div className="text-sm mt-2 text-muted-foreground">
          {trend.value}
        </div>
      );
    }
    
    // Otherwise show colored with arrow
    return (
      <div className={`text-sm mt-2 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
        {trend.isPositive ? '↗' : '↘'} {trend.value}
      </div>
    );
  };

  return (
    <Card 
      className={`shadow-soft hover:shadow-medium transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {getTrendDisplay()}
        </div>
      </CardContent>
    </Card>
  );
};