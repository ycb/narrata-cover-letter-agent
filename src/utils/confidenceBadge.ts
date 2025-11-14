/**
 * Unified confidence badge utilities
 * 
 * Provides consistent, semantic confidence badge colors based on percentage ranges.
 * Uses design system colors for consistency across the application.
 */

/**
 * Get confidence badge color based on percentage (0-100)
 * 
 * Ranges:
 * - 80-100%: High confidence (green/success)
 * - 60-79%: Medium confidence (blue/info)
 * - 40-59%: Moderate confidence (yellow/warning)
 * - 0-39%: Low confidence (gray/muted)
 */
export function getConfidenceBadgeColor(percentage: number): string {
  if (percentage >= 80) {
    return 'bg-success text-success-foreground';
  } else if (percentage >= 60) {
    return 'bg-blue-600 text-white';
  } else if (percentage >= 40) {
    return 'bg-warning text-warning-foreground';
  } else {
    return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get confidence progress bar color based on percentage (0-100)
 * Matches badge colors for visual consistency
 */
export function getConfidenceProgressColor(percentage: number): string {
  if (percentage >= 80) {
    return '[&>div]:bg-success';
  } else if (percentage >= 60) {
    return '[&>div]:bg-blue-600';
  } else if (percentage >= 40) {
    return '[&>div]:bg-warning';
  } else {
    return '[&>div]:bg-muted-foreground';
  }
}

/**
 * Get confidence level label from percentage
 */
export function getConfidenceLevel(percentage: number): 'high' | 'medium' | 'moderate' | 'low' {
  if (percentage >= 80) return 'high';
  if (percentage >= 60) return 'medium';
  if (percentage >= 40) return 'moderate';
  return 'low';
}

/**
 * Convert text-based confidence to percentage (for backward compatibility)
 */
export function textConfidenceToPercentage(confidence: 'high' | 'medium' | 'low'): number {
  switch (confidence) {
    case 'high': return 85;
    case 'medium': return 65;
    case 'low': return 45;
    default: return 50;
  }
}

