import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface ShowAllTemplateProps<T> {
  title: string;
  description: string;
  data: T[];
  searchPlaceholder: string;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderHeader: () => React.ReactNode;
  onAddNew?: () => void;
  addNewLabel?: string;
  filters?: FilterOption[];
  defaultFilter?: string;
  onFilterChange?: (filter: string) => void;
  searchKeys?: (keyof T)[];
  emptyStateMessage?: string;
  isLoading?: boolean;
}

export function ShowAllTemplate<T>({
  title,
  description,
  data,
  searchPlaceholder,
  renderRow,
  renderHeader,
  onAddNew,
  addNewLabel = "Add New",
  filters,
  defaultFilter = "all",
  onFilterChange,
  searchKeys = [],
  emptyStateMessage = "No items found",
  isLoading = false
}: ShowAllTemplateProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState(defaultFilter);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = data;

    // Apply filter
    if (activeFilter !== "all" && filters) {
      result = result.filter(item => {
        // This is a generic filter - specific implementations can override
        return true; // Placeholder - will be customized per use case
      });
    }

    // Apply search
    if (searchTerm && searchKeys.length > 0) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => {
        return searchKeys.some(key => {
          const value = item[key];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          }
          if (typeof value === 'number') {
            return value.toString().includes(searchLower);
          }
          return false;
        });
      });
    }

    // Apply sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (aVal === bVal) return 0;
        
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, activeFilter, searchTerm, searchKeys, sortField, sortDirection, filters]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof T) => {
    if (sortField !== field) return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-primary" />
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-muted-foreground description-spacing">{description}</p>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </div>
            {onAddNew && (
              <Button onClick={onAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                {addNewLabel}
              </Button>
            )}
          </div>

          {/* Controls */}
          <Card className="shadow-soft mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Filters */}
                {filters && filters.length > 0 && (
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                          {activeFilter !== "all" && (
                            <Badge variant="secondary" className="ml-2">
                              {filters.find(f => f.value === activeFilter)?.label}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                          All
                          {filters.some(f => f.count !== undefined) && (
                            <Badge variant="secondary" className="ml-auto">
                              {data.length}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                        {filters.map((filter) => (
                          <DropdownMenuItem 
                            key={filter.value}
                            onClick={() => handleFilterChange(filter.value)}
                          >
                            {filter.label}
                            {filter.count !== undefined && (
                              <Badge variant="secondary" className="ml-auto">
                                {filter.count}
                              </Badge>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} items
            </p>
          </div>

          {/* Table */}
          <Card className="shadow-soft">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    {renderHeader()}
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={100} className="p-8 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={100} className="p-8 text-center text-muted-foreground">
                          {emptyStateMessage}
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item, index) => renderRow(item, index))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
