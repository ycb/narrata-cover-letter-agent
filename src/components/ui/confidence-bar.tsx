interface ConfidenceBarProps {
  percentage: number;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceBar({ percentage, showLabel = true, className = "" }: ConfidenceBarProps) {
  const level = percentage >= 90 ? "Advanced" : 
                percentage >= 70 ? "Proficient" : 
                percentage >= 50 ? "Developing" : 
                "Needs Work";
  
  const levelColor = 
    percentage >= 80 ? "text-green-600" : 
    percentage >= 60 ? "text-blue-600" : 
    percentage >= 40 ? "text-yellow-600" : 
    "text-gray-600";
  
  const barColor = 
    percentage >= 80 ? "bg-green-500" : 
    percentage >= 60 ? "bg-blue-500" : 
    percentage >= 40 ? "bg-yellow-500" : 
    "bg-gray-400";
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className={`font-semibold ${levelColor}`}>
          {showLabel && `${level} (`}{percentage}%{showLabel && ")"}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={`${barColor} h-2 rounded-full transition-all`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

