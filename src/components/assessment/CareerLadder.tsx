import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PMLevelCode } from '@/types/content';
import { cn } from '@/lib/utils';

interface LevelCard {
  code: PMLevelCode | 'coming-soon';
  name: string;
  yearsOfExperience: string;
  coreCompetency: string;
  scopeOfOwnership: string;
  isIC: boolean;
}

// All levels in order with detailed parameters
const ALL_LEVELS: LevelCard[] = [
  { 
    code: 'L3', 
    name: 'Associate Product Manager', 
    yearsOfExperience: '0-2 years',
    coreCompetency: 'Feature delivery',
    scopeOfOwnership: 'Single features',
    isIC: true 
  },
  { 
    code: 'L4', 
    name: 'Product Manager', 
    yearsOfExperience: '2-4 years',
    coreCompetency: 'Product ownership',
    scopeOfOwnership: 'Product area',
    isIC: true 
  },
  { 
    code: 'L5', 
    name: 'Senior Product Manager', 
    yearsOfExperience: '4-7 years',
    coreCompetency: 'Strategic execution',
    scopeOfOwnership: 'Product line',
    isIC: true 
  },
  { 
    code: 'L6', 
    name: 'Staff/Principal Product Manager', 
    yearsOfExperience: '7-10 years',
    coreCompetency: 'Product strategy',
    scopeOfOwnership: 'Multiple product lines',
    isIC: true 
  },
  { 
    code: 'M1', 
    name: 'Group Product Manager', 
    yearsOfExperience: '10+ years',
    coreCompetency: 'Team leadership',
    scopeOfOwnership: 'Product group',
    isIC: false 
  },
  { 
    code: 'M2', 
    name: 'Director of Product', 
    yearsOfExperience: '10+ years',
    coreCompetency: 'Organizational leadership',
    scopeOfOwnership: 'Product organization',
    isIC: false 
  },
  { 
    code: 'coming-soon', 
    name: 'Senior Leadership', 
    yearsOfExperience: '',
    coreCompetency: '',
    scopeOfOwnership: 'VP, SVP, CPO roles',
    isIC: false 
  }
];

interface CareerLadderProps {
  currentLevelCode: PMLevelCode;
  currentLevelDisplay: string;
  onViewEvidence?: () => void;
}

export function CareerLadder({ 
  currentLevelCode, 
  currentLevelDisplay,
  onViewEvidence 
}: CareerLadderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Determine which track the current level is in (based on currentLevelCode, not scrolling)
  const isCurrentLevelIC = ['L3', 'L4', 'L5', 'L6'].includes(currentLevelCode);
  
  // Check scroll position and update buttons
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Scroll handlers
  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
    scrollContainerRef.current.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  // Check scroll position on mount and scroll events
  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      };
    }
  }, []);

  // Determine if level is completed (below current), current, or pending (above current)
  const getLevelStatus = (code: PMLevelCode | 'coming-soon'): 'completed' | 'current' | 'pending' | 'coming-soon' => {
    if (code === 'coming-soon') return 'coming-soon';
    
    const levelOrder: (PMLevelCode | 'coming-soon')[] = ['L3', 'L4', 'L5', 'L6', 'M1', 'M2', 'coming-soon'];
    const currentIndex = levelOrder.indexOf(currentLevelCode);
    const levelIndex = levelOrder.indexOf(code);
    
    if (currentIndex === -1 || levelIndex === -1) return 'pending';
    if (levelIndex < currentIndex) return 'completed';
    if (levelIndex === currentIndex) return 'current';
    return 'pending';
  };

  // Get IC and Leadership level groups
  const icLevels = ALL_LEVELS.filter(l => l.isIC);
  const leadershipLevels = ALL_LEVELS.filter(l => !l.isIC);

  // Level Card Component - Portrait orientation
  const LevelCard = ({ level, status }: { level: LevelCard; status: 'completed' | 'current' | 'pending' | 'coming-soon' }) => {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';
    const isPending = status === 'pending';
    const isComingSoon = status === 'coming-soon';
    const isIC = level.isIC;
    
    return (
      <Card 
        className={cn(
          "flex-shrink-0 w-40 h-56 p-4 transition-all flex flex-col",
          // White background for all except current
          isCurrent 
            ? (isIC ? "bg-blue-600 text-white" : "bg-green-600 text-white")
            : "bg-white",
          // Completed: solid border
          isCompleted && (isIC ? "border-2 border-blue-600" : "border-2 border-green-600"),
          // Current: no border needed (reverse-out styling)
          !isCurrent && isIC && "border-2 border-blue-300",
          !isCurrent && !isIC && "border-2 border-green-300",
          // Pending: dotted border
          isPending && (isIC ? "border-dashed" : "border-dashed"),
          // Coming soon: dotted gray border
          isComingSoon && "border-2 border-dashed border-gray-300"
        )}
      >
        <div className="flex flex-col h-full space-y-2">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isCompleted && (
              <CheckCircle2 className={cn(
                "h-5 w-5",
                isIC ? "text-blue-600" : "text-green-600"
              )} />
            )}
            {isCurrent && (
              <Badge className={cn(
                "bg-white text-xs",
                isIC ? "text-blue-600" : "text-green-600"
              )}>
                Current
              </Badge>
            )}
            {isPending && (
              <Circle className={cn(
                "h-5 w-5",
                isIC ? "text-blue-300" : "text-green-300"
              )} />
            )}
            {isComingSoon && (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
          </div>
          
          {/* Level Name */}
          <h4 className={cn(
            "font-semibold text-sm flex-grow",
            isCurrent 
              ? "text-white"
              : (isIC ? "text-blue-900" : "text-green-900"),
            isPending && !isCurrent && "text-gray-600",
            isComingSoon && "text-gray-600"
          )}>
            {level.name}
          </h4>
          
          {/* Level Parameters - Bullet points */}
          {!isComingSoon ? (
            <ul className="mt-auto space-y-1 text-xs list-disc list-inside">
              <li className={cn(
                isCurrent 
                  ? "text-white/90"
                  : (isIC ? "text-blue-700" : "text-green-700"),
                isPending && !isCurrent && "text-gray-500"
              )}>
                {level.yearsOfExperience}
              </li>
              <li className={cn(
                isCurrent 
                  ? "text-white/90"
                  : (isIC ? "text-blue-700" : "text-green-700"),
                isPending && !isCurrent && "text-gray-500"
              )}>
                {level.coreCompetency}
              </li>
              <li className={cn(
                isCurrent 
                  ? "text-white/90"
                  : (isIC ? "text-blue-700" : "text-green-700"),
                isPending && !isCurrent && "text-gray-500"
              )}>
                {level.scopeOfOwnership}
              </li>
            </ul>
          ) : (
            <p className="text-xs text-gray-500 italic mt-auto">
              {level.scopeOfOwnership}
            </p>
          )}
        </div>
      </Card>
    );
  };

  // Calculate widths for banner alignment (card width: 160px, gap: 16px)
  const icCardsWidth = (icLevels.length * 160) + ((icLevels.length - 1) * 16);
  const leadershipCardsWidth = (leadershipLevels.length * 160) + ((leadershipLevels.length - 1) * 16);

  return (
    <div className="space-y-6">
      {/* Career Ladder with Banners */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-background to-transparent hover:from-background/80 flex items-center justify-start pl-2 cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-foreground/60 hover:text-foreground" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-background to-transparent hover:from-background/80 flex items-center justify-end pr-2 cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-foreground/60 hover:text-foreground" />
          </button>
        )}

        {/* Horizontal scrollable container */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto scroll-smooth pb-4" 
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="inline-block min-w-max px-2">
            {/* Cards Row */}
            <div className="flex items-start gap-4 mb-3">
              {/* IC Track Cards */}
              <div className="flex items-center gap-4">
                {icLevels.map((level) => {
                  const status = getLevelStatus(level.code);
                  return (
                    <LevelCard 
                      key={level.code} 
                      level={level} 
                      status={status}
                    />
                  );
                })}
              </div>

              {/* Leadership Track Cards */}
              <div className="flex items-center gap-4">
                {leadershipLevels.map((level) => {
                  const status = getLevelStatus(level.code);
                  return (
                    <LevelCard 
                      key={level.code} 
                      level={level} 
                      status={status}
                    />
                  );
                })}
              </div>
            </div>

            {/* Banners Row */}
            <div className="flex items-start gap-4">
              {/* IC Banner */}
              <div 
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-shrink-0"
                style={{ width: `${icCardsWidth}px` }}
              >
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">IC Track:</span> Advance by demonstrating execution, customer insight, strategic thinking, and cross-functional leadership
                </p>
              </div>

              {/* Leadership Banner */}
              <div 
                className="bg-green-50 border border-green-200 rounded-lg p-4 flex-shrink-0"
                style={{ width: `${leadershipCardsWidth}px` }}
              >
                <p className="text-sm text-green-900">
                  <span className="font-semibold">Leadership Track:</span> Advance by leading organizational strategy, managing multiple teams, and driving company-wide initiatives
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
