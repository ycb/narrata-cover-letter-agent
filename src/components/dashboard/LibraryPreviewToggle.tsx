import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  FileText, 
  Eye, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Building2,
  Briefcase,
  Star,
  Calendar,
  Plus
} from "lucide-react";

interface LibraryPreviewToggleProps {
  type: 'workHistory' | 'savedSections' | 'stories';
  title: string;
  description: string;
  count: number;
  previewData: any[];
  onViewAll: () => void;
  onAddNew: () => void;
}

export function LibraryPreviewToggle({ 
  type, 
  title, 
  description, 
  count, 
  previewData, 
  onViewAll, 
  onAddNew 
}: LibraryPreviewToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = () => {
    switch (type) {
      case 'workHistory':
        return Users;
      case 'savedSections':
        return BookOpen;
      case 'stories':
        return FileText;
      default:
        return BookOpen;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'workHistory':
        return 'blue';
      case 'savedSections':
        return 'purple';
      case 'stories':
        return 'green';
      default:
        return 'blue';
    }
  };

  const renderWorkHistoryPreview = () => (
    <div className="space-y-3">
      {previewData.slice(0, 3).map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{item.company}</div>
              <div className="text-sm text-gray-600">{item.role}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">{item.duration}</div>
            <Badge variant="secondary" className="text-xs">
              {item.type}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSavedSectionsPreview = () => (
    <div className="space-y-3">
      {previewData.slice(0, 3).map((item, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-900">{item.title}</div>
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {item.content}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {item.lastUsed}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStoriesPreview = () => (
    <div className="space-y-3">
      {previewData.slice(0, 3).map((item, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-900">{item.title}</div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-gray-500">{item.rating}</span>
            </div>
          </div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {item.content}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <Briefcase className="w-3 h-3" />
            {item.company}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPreviewContent = () => {
    switch (type) {
      case 'workHistory':
        return renderWorkHistoryPreview();
      case 'savedSections':
        return renderSavedSectionsPreview();
      case 'stories':
        return renderStoriesPreview();
      default:
        return null;
    }
  };

  const TypeIcon = getTypeIcon();
  const colorClass = getTypeColor();

  return (
    <Card className="shadow-soft border-2 border-gray-200 hover:border-gray-300 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-${colorClass}-100 rounded-lg flex items-center justify-center`}>
              <TypeIcon className={`w-6 h-6 text-${colorClass}-600`} />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900">{title}</CardTitle>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Preview Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show Preview
              </>
            )}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddNew}
              className="text-xs"
            >
              Add New
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAll}
              className="text-xs"
            >
              View All
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 pt-4">
            {renderPreviewContent()}
            
            {previewData.length > 3 && (
              <div className="text-center pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-gray-600 hover:text-gray-900"
                >
                  View {count - 3} more items
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddNew}
              className="w-full text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add New
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAll}
              className="w-full text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
