import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info,
  FileText,
  Linkedin,
  Mail,
  BookOpen,
  TrendingUp,
  Lightbulb
} from "lucide-react";

interface ParsingResult {
  type: 'resume' | 'linkedin' | 'coverLetter';
  success: boolean;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  details: string[];
  suggestions: string[];
  icon: React.ComponentType<{ className?: string }>;
}

interface ParsingResultsCardProps {
  results: ParsingResult[];
  onViewDetails?: (type: string) => void;
}

export function ParsingResultsCard({ results, onViewDetails }: ParsingResultsCardProps) {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/25';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'resume':
        return 'Resume';
      case 'linkedin':
        return 'LinkedIn Profile';
      case 'coverLetter':
        return 'Cover Letter';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'resume':
        return FileText;
      case 'linkedin':
        return Linkedin;
      case 'coverLetter':
        return Mail;
      default:
        return BookOpen;
    }
  };

  const totalItems = results.reduce((sum, result) => {
    const detailCount = result.details.length;
    return sum + detailCount;
  }, 0);

  const highConfidenceItems = results.filter(r => r.confidence === 'high').length;
  const needsAttentionItems = results.filter(r => r.confidence !== 'high').length;

  return (
    <Card className="shadow-soft border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-blue-900">Parsing Results</CardTitle>
            <p className="text-sm text-blue-700">
              Here's what we extracted from your uploads
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">{totalItems}</div>
            <div className="text-sm text-blue-700">Items Found</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white/50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-green-600">{highConfidenceItems}</div>
            <div className="text-sm text-green-700">High Quality</div>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-yellow-600">{needsAttentionItems}</div>
            <div className="text-sm text-yellow-700">Needs Attention</div>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{results.length}</div>
            <div className="text-sm text-blue-700">Files Processed</div>
          </div>
        </div>

        {/* Individual Results */}
        <div className="space-y-3">
          {results.map((result, index) => {
            const TypeIcon = getTypeIcon(result.type);
            
            return (
              <div key={index} className="bg-white/70 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TypeIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">
                        {getTypeLabel(result.type)}
                      </h4>
                      <p className="text-sm text-blue-700">{result.summary}</p>
                    </div>
                  </div>
                  <Badge className={`${getConfidenceColor(result.confidence)}`}>
                    {getConfidenceIcon(result.confidence)}
                    <span className="ml-1 capitalize">{result.confidence} Confidence</span>
                  </Badge>
                </div>

                {/* Details */}
                {result.details.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-blue-800 mb-2">What we found:</div>
                    <div className="space-y-1">
                      {result.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center gap-2 text-sm text-blue-700">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-2">
                      <Lightbulb className="w-4 h-4" />
                      Suggestions for improvement:
                    </div>
                    <div className="space-y-1">
                      {result.suggestions.map((suggestion, suggestionIndex) => (
                        <div key={suggestionIndex} className="text-sm text-yellow-700">
                          • {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {onViewDetails && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(result.type)}
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      View Details
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Message */}
        <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Info className="w-4 h-4" />
            <span className="font-medium">Next Steps</span>
          </div>
          <p className="text-sm text-blue-600">
            Review the content below and keep what looks good. We'll automatically analyze your stories 
            and suggest improvements to help you build a stronger profile over time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
