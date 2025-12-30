import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
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

export interface SortOption {
  label: string;
  value: string;
  category: 'company' | 'role' | 'tag' | 'section-type' | 'gap' | 'other';
}

export interface ShowAllTemplateProps<T> {
  title: string;
  description: string;
  data: T[];
  searchPlaceholder: string;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderHeader: (handleSort: (field: keyof T | string) => void, getSortIcon: (field: keyof T | string) => React.ReactNode) => React.ReactNode;
  onAddNew?: () => void;
  addNewLabel?: string;
  searchKeys?: (keyof T)[];
  emptyStateMessage?: string;
  isLoading?: boolean;
  sortOptions?: SortOption[];
  filters?: FilterOption[];
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
  sortOptions,
  filters,
}: ShowAllTemplateProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Partial<Record<SortOption['category'], string>>>({});
  const [activeSimpleFilter, setActiveSimpleFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const hasAdvancedFilters = Boolean(sortOptions && sortOptions.length);
  const hasSimpleFilters = !hasAdvancedFilters && Boolean(filters && filters.length);
  const groupedSortOptions = useMemo(() => {
    const grouped = new Map<SortOption['category'], SortOption[]>();
    (sortOptions || []).forEach((option) => {
      const current = grouped.get(option.category) || [];
      current.push(option);
      grouped.set(option.category, current);
    });
    return grouped;
  }, [sortOptions]);
  const getCategoryLabel = (category: SortOption['category']) => {
    switch (category) {
      case 'company':
        return 'Company';
      case 'role':
        return 'Role';
      case 'tag':
        return 'Tag';
      case 'section-type':
        return 'Section';
      case 'gap':
        return 'Gap';
      default:
        return 'Filter';
    }
  };

  const getOptionLabel = (category: SortOption['category'], value: string) => {
    return sortOptions?.find((option) => option.category === category && option.value === value)?.label ?? value;
  };

  const activeFilterChips = useMemo(() => {
    return Object.entries(activeFilters)
      .filter(([, value]) => Boolean(value))
      .map(([category, value]) => ({
        category: category as SortOption['category'],
        value: value as string,
        label: getOptionLabel(category as SortOption['category'], value as string),
      }));
  }, [activeFilters, sortOptions]);

  const hasActiveFilters = activeFilterChips.length > 0;

  const searchFilteredData = useMemo(() => {
    let result = data;

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

    return result;
  }, [data, searchTerm, searchKeys]);

  const matchesAdvancedFilter = (
    item: any,
    category: SortOption['category'],
    value: string,
  ) => {
    switch (category) {
      case 'company':
        return item.company === value;
      case 'role':
        return item.role === value;
      case 'tag':
        return Array.isArray(item.tags) && item.tags.includes(value);
      case 'section-type':
        return item.type === value;
      case 'gap': {
        const hasGaps = Boolean(item.hasGaps);
        return value === 'gap-detected' ? hasGaps : !hasGaps;
      }
      default:
        return false;
    }
  };

  const filterByActiveFilters = (items: T[], excludeCategory?: SortOption['category']) => {
    if (!hasAdvancedFilters || !sortOptions) {
      return items;
    }
    return items.filter((item) =>
      Object.entries(activeFilters).every(([category, value]) => {
        if (!value) return true;
        const typedCategory = category as SortOption['category'];
        if (excludeCategory && typedCategory === excludeCategory) return true;
        return matchesAdvancedFilter(item, typedCategory, value);
      }),
    );
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = searchFilteredData;

    if (hasAdvancedFilters && sortOptions) {
      result = filterByActiveFilters(result);
    } else if (hasSimpleFilters && filters && activeSimpleFilter !== "all") {
      const selectedFilter = filters.find(
        (filter) => filter.value === activeSimpleFilter || filter.label === activeSimpleFilter,
      );
      if (selectedFilter) {
        const searchToken = selectedFilter.label.toLowerCase();
        result = result.filter((item) =>
          Object.values(item).some((value) => {
            if (typeof value === 'string') {
              return value.toLowerCase().includes(searchToken);
            }
            if (Array.isArray(value)) {
              return value.some(
                (entry) => typeof entry === 'string' && entry.toLowerCase().includes(searchToken),
              );
            }
            return false;
          }),
        );
      }
    }

    // Apply sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        // Handle hasGaps as a special case (boolean field)
        if (sortField === 'hasGaps') {
          const aHasGaps = (a as any).hasGaps || false;
          const bHasGaps = (b as any).hasGaps || false;
          if (aHasGaps === bHasGaps) return 0;
          return sortDirection === 'asc'
            ? (aHasGaps ? 1 : -1) - (bHasGaps ? 1 : -1)
            : (bHasGaps ? 1 : -1) - (aHasGaps ? 1 : -1);
        }

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
  }, [
    searchFilteredData,
    hasAdvancedFilters,
    sortOptions,
    hasSimpleFilters,
    filters,
    activeSimpleFilter,
    sortField,
    sortDirection,
    activeFilters,
  ]);

  const collectValuesForCategory = (items: T[], category: SortOption['category']) => {
    const values = new Set<string>();
    let hasGapDetected = false;
    let hasNoGaps = false;

    items.forEach((item: any) => {
      switch (category) {
        case 'company':
          if (item.company) values.add(item.company);
          break;
        case 'role':
          if (item.role) values.add(item.role);
          break;
        case 'tag':
          if (Array.isArray(item.tags)) {
            item.tags.forEach((tag: string) => values.add(tag));
          }
          break;
        case 'section-type':
          if (item.type) values.add(item.type);
          break;
        case 'gap': {
          const itemHasGaps = Boolean(item.hasGaps);
          if (itemHasGaps) {
            hasGapDetected = true;
          } else {
            hasNoGaps = true;
          }
          break;
        }
        default:
          break;
      }
    });

    if (category === 'gap') {
      if (hasGapDetected) values.add('gap-detected');
      if (hasNoGaps) values.add('no-gaps');
    }

    return values;
  };

  const availableValuesByCategory = useMemo(() => {
    if (!sortOptions || sortOptions.length === 0 || !hasAdvancedFilters) {
      return new Map<SortOption['category'], Set<string>>();
    }

    const categories = new Set<SortOption['category']>();
    sortOptions.forEach((option) => categories.add(option.category));

    const valuesByCategory = new Map<SortOption['category'], Set<string>>();

    categories.forEach((category) => {
      const scopedItems = filterByActiveFilters(searchFilteredData, category);
      valuesByCategory.set(category, collectValuesForCategory(scopedItems, category));
    });

    return valuesByCategory;
  }, [sortOptions, searchFilteredData, activeFilters, hasAdvancedFilters]);

  const getOptionsForCategory = (category: SortOption['category']) => {
    const baseOptions = (sortOptions || []).filter((option) => option.category === category);
    const available = availableValuesByCategory.get(category);
    let options = baseOptions;
    if (available && available.size > 0) {
      options = options.filter((option) => available.has(option.value));
    }
    const selectedValue = activeFilters[category];
    if (selectedValue) {
      options = options.filter((option) => option.value !== selectedValue);
    }
    return options;
  };

  const handleFilterChange = (category: SortOption['category'], value: string | null) => {
    setActiveFilters((prev) => ({
      ...prev,
      [category]: value ?? undefined,
    }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  const handleSort = (field: keyof T | string) => {
    const sortKey = field as keyof T;
    if (sortField === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortKey);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof T | string) => {
    const sortKey = field as keyof T;
    if (sortField !== sortKey) return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 text-primary" />
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };



  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
              <p className="text-muted-foreground description-spacing">{description}</p>
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

                {/* Horizontal Filter Bar */}
                {hasAdvancedFilters && sortOptions && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Filter className="h-4 w-4" />
                      Filter
                    </div>
                    {groupedSortOptions.get('company') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Company</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60">
                          {getOptionsForCategory('company').map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleFilterChange('company', option.value)}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {groupedSortOptions.get('role') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Role</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60">
                          {getOptionsForCategory('role').map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleFilterChange('role', option.value)}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {groupedSortOptions.get('gap') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Gap</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60">
                          {getOptionsForCategory('gap').map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleFilterChange('gap', option.value)}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {groupedSortOptions.get('tag') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Tags</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60">
                          {getOptionsForCategory('tag').map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleFilterChange('tag', option.value)}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {groupedSortOptions.get('section-type') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Sections</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60">
                          {getOptionsForCategory('section-type').map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleFilterChange('section-type', option.value)}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {hasActiveFilters && (
                      <div className="flex flex-wrap items-center gap-2">
                        {activeFilterChips.map((chip) => (
                          <Badge
                            key={`${chip.category}-${chip.value}`}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <span className="text-xs text-muted-foreground">
                              {getCategoryLabel(chip.category)}
                            </span>
                            <span>{chip.label}</span>
                            <button
                              type="button"
                              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                              onClick={() => handleFilterChange(chip.category, null)}
                              aria-label={`Remove ${chip.label}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {hasSimpleFilters && filters && (
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                          {activeSimpleFilter !== "all" && (
                            <Badge variant="secondary" className="ml-2">
                              {activeSimpleFilter}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        {filters.map(filter => (
                          <DropdownMenuItem
                            key={filter.value}
                            onClick={() => setActiveSimpleFilter(filter.value)}
                          >
                            <span className="flex-1">{filter.label}</span>
                            {typeof filter.count === 'number' && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {filter.count}
                              </Badge>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {activeSimpleFilter !== "all" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSimpleFilter("all")}
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
