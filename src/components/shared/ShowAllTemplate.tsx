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
  ChevronUp,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SortOption {
  label: string;
  value: string;
  category: 'company' | 'role' | 'tag' | 'other';
}

export interface ShowAllTemplateProps<T> {
  title: string;
  description: string;
  data: T[];
  searchPlaceholder: string;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderHeader: (handleSort: (field: keyof T) => void, getSortIcon: (field: keyof T) => React.ReactNode) => React.ReactNode;
  onAddNew?: () => void;
  addNewLabel?: string;
  searchKeys?: (keyof T)[];
  emptyStateMessage?: string;
  isLoading?: boolean;
  sortOptions?: SortOption[];
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
  searchKeys = [],
  emptyStateMessage = "No items found",
  isLoading = false,
  sortOptions
}: ShowAllTemplateProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection] = useState<'asc' | 'desc'>('asc');
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = data;

    // Apply filter
    if (activeFilter !== "all") {
      result = result.filter(item => {
        // Check if any of the sortOptions match the activeFilter
        if (sortOptions) {
          return sortOptions.some(option => {
            if (option.value === activeFilter) {
              // For company, role, tag, and section-type categories, we need to map to the correct field
              let fieldToCheck: keyof T;
              switch (option.category) {
                case 'company':
                  fieldToCheck = 'company' as keyof T;
                  break;
                case 'role':
                  fieldToCheck = 'role' as keyof T;
                  break;
                case 'tag':
                  fieldToCheck = 'tags' as keyof T;
                  break;
                case 'section-type':
                  fieldToCheck = 'type' as keyof T;
                  break;
                default:
                  fieldToCheck = option.value as keyof T;
              }
              
              const itemValue = item[fieldToCheck];
              if (typeof itemValue === 'string') {
                return itemValue === option.label;
              }
              if (Array.isArray(itemValue)) {
                return itemValue.includes(option.label);
              }
            }
            return false;
          });
        }
        return true;
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
  }, [data, activeFilter, searchTerm, searchKeys, sortField, sortDirection, sortOptions]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
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
                
                {/* Single Filter Fly-out Component */}
                {sortOptions && sortOptions.length > 0 && (
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                          {activeFilter !== "all" && (
                            <Badge variant="secondary" className="ml-2">
                              {activeFilter}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72">
                        {/* Company Fly-out */}
                        {sortOptions.some(s => s.category === 'company') && (
                          <DropdownMenuSub onOpenChange={(open) => setOpenSubmenu(open ? 'company' : null)}>
                            <DropdownMenuSubTrigger 
                              className={`px-3 py-2 transition-colors ${
                                openSubmenu === 'company' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'hover:bg-blue-600 hover:text-white'
                              }`}
                            >
                              <span className="flex-1 text-left">Company</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                              <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                                All Companies
                              </DropdownMenuItem>
                              {sortOptions
                                .filter(s => s.category === 'company')
                                .map((option) => (
                                  <DropdownMenuItem 
                                    key={option.value}
                                    onClick={() => handleFilterChange(option.value)}
                                    className="px-3 py-2 hover:bg-blue-600 hover:text-white"
                                  >
                                    <span className="flex-1">{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Role Fly-out */}
                        {sortOptions.some(s => s.category === 'role') && (
                          <DropdownMenuSub onOpenChange={(open) => setOpenSubmenu(open ? 'role' : null)}>
                            <DropdownMenuSubTrigger 
                              className={`px-3 py-2 transition-colors ${
                                openSubmenu === 'role' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'hover:bg-blue-600 hover:text-white'
                              }`}
                            >
                              <span className="flex-1 text-left">Role</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                              <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                                All Roles
                              </DropdownMenuItem>
                              {sortOptions
                                .filter(s => s.category === 'role')
                                .map((option) => (
                                  <DropdownMenuItem 
                                    key={option.value}
                                    onClick={() => handleFilterChange(option.value)}
                                    className="px-3 py-2 hover:bg-blue-600 hover:text-white"
                                  >
                                    <span className="flex-1">{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Sections Fly-out */}
                        {sortOptions.some(s => s.category === 'section-type') && (
                          <DropdownMenuSub onOpenChange={(open) => setOpenSubmenu(open ? 'sections' : null)}>
                            <DropdownMenuSubTrigger 
                              className={`px-3 py-2 transition-colors ${
                                openSubmenu === 'sections' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'hover:bg-blue-600 hover:text-white'
                              }`}
                            >
                              <span className="flex-1 text-left">Sections</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                              <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                                All Sections
                              </DropdownMenuItem>
                              {sortOptions
                                .filter(s => s.category === 'section-type')
                                .map((option) => (
                                  <DropdownMenuItem 
                                    key={option.value}
                                    onClick={() => handleFilterChange(option.value)}
                                    className="px-3 py-2 hover:bg-blue-600 hover:text-white"
                                  >
                                    <span className="flex-1">{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Tags Fly-out */}
                        {sortOptions.some(s => s.category === 'tag') && (
                          <DropdownMenuSub onOpenChange={(open) => setOpenSubmenu(open ? 'tags' : null)}>
                            <DropdownMenuSubTrigger 
                              className={`px-3 py-2 transition-colors ${
                                openSubmenu === 'tags' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'hover:bg-blue-600 hover:text-white'
                              }`}
                            >
                              <span className="flex-1 text-left">Tags</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                              <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                                All Tags
                              </DropdownMenuItem>
                              {sortOptions
                                .filter(s => s.category === 'tag')
                                .map((option) => (
                                  <DropdownMenuItem 
                                    key={option.value}
                                    onClick={() => handleFilterChange(option.value)}
                                    className="px-3 py-2 hover:bg-blue-600 hover:text-white"
                                  >
                                    <span className="flex-1">{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}


                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Clear Filters Button */}
                    {activeFilter !== "all" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleFilterChange("all")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    )}
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
                    {renderHeader(handleSort, getSortIcon)}
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
