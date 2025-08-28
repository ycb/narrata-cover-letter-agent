import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Trash2,
  Check,
  AlertTriangle,
  Info,
  Users,
  FileText,
  Mail,
  BookOpen
} from "lucide-react";

interface ReviewItem {
  id: string;
  type: 'resume' | 'linkedin' | 'coverLetter';
  title: string;
  content: string;
  quality: 'high' | 'medium' | 'low';
  details: string[];
  suggestions: string[];
  icon: React.ComponentType<{ className?: string }>;
}

interface SimpleContentReviewProps {
  items: ReviewItem[];
  onReviewComplete: (keptItems: ReviewItem[]) => void;
}

export function SimpleContentReview({ items, onReviewComplete }: SimpleContentReviewProps) {
  const [keptItems, setKeptItems] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;
  const isLastItem = currentIndex === items.length - 1;

  const handleKeep = () => {
    setKeptItems(prev => new Set([...prev, currentItem.id]));
    if (isLastItem) {
      completeReview();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleDelete = () => {
    if (isLastItem) {
      completeReview();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleKeepAll = () => {
    const allIds = new Set(items.map(item => item.id));
    setKeptItems(allIds);
    completeReview();
  };

  const handleDeleteAll = () => {
    setKeptItems(new Set());
    completeReview();
  };

  const completeReview = () => {
    setIsProcessing(true);
    const kept = items.filter(item => keptItems.has(item.id));
    
    // Simulate processing delay
    setTimeout(() => {
      onReviewComplete(kept);
    }, 1000);
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
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

  const getQualityIcon = (quality: string) => {
    switch (quality) {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'resume':
        return FileText;
      case 'linkedin':
        return Users;
      case 'coverLetter':
        return Mail;
      default:
        return BookOpen;
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

  if (isProcessing) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Processing Your Content
            </h3>
            <p className="text-gray-600">
              We're organizing your imported content into structured objects...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentItem) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Review Complete!
            </h3>
            <p className="text-gray-600">
              You've reviewed all {items.length} items. Ready to proceed!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TypeIcon = getTypeIcon(currentItem.type);
  const QualityIcon = getQualityIcon(currentItem.quality);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Review Your Content
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We've analyzed your uploads and extracted the key information. 
          Review each item and keep what looks good.
        </p>
        
        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Item {currentIndex + 1} of {items.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Current Item Card */}
      <Card className="shadow-soft max-w-2xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TypeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900">
                  {getTypeLabel(currentItem.type)}
                </CardTitle>
                <p className="text-sm text-gray-600">{currentItem.title}</p>
              </div>
            </div>
            <Badge className={`${getQualityColor(currentItem.quality)}`}>
              <QualityIcon />
              <span className="ml-1 capitalize">{currentItem.quality} Quality</span>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Content Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-700 line-clamp-3">
              {currentItem.content}
            </div>
          </div>

          {/* Quality Details */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">What we found:</div>
            <div className="space-y-1">
              {currentItem.details.map((detail, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {detail}
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {currentItem.suggestions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Suggestions for improvement:
              </div>
              <div className="space-y-1">
                {currentItem.suggestions.map((suggestion, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    • {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleKeep}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Keep This
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      <div className="text-center space-y-3">
        <div className="text-sm text-gray-600">
          Want to review everything at once?
        </div>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleKeepAll}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Check className="w-4 h-4 mr-2" />
            Keep All
          </Button>
          <Button
            onClick={handleDeleteAll}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-blue-700 mb-2">
          <Info className="w-4 h-4" />
          <span className="font-medium">Note</span>
        </div>
        <p className="text-sm text-blue-600">
          We'll automatically analyze your stories and suggest improvements to help you build 
          a stronger profile over time. For now, focus on getting your content organized.
        </p>
      </div>
    </div>
  );
}
