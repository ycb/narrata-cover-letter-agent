/**
 * Company Maturity Utilities
 * Maps company stage to maturity for PM Levels calculation
 */

export type CompanyStage = 'startup' | 'growth-stage' | 'established' | 'enterprise';
export type BusinessMaturity = 'early' | 'growth' | 'late';

/**
 * Maps company stage to business maturity for PM Levels
 * 
 * Mapping:
 * - startup → early (0.8x modifier)
 * - growth-stage → growth (1.0x modifier)
 * - established → late (1.2x modifier)
 * - enterprise → late (1.2x modifier)
 */
export function mapCompanyStageToMaturity(stage: string | null | undefined): BusinessMaturity | null {
  if (!stage) return null;
  
  const normalizedStage = stage.toLowerCase().trim();
  
  switch (normalizedStage) {
    case 'startup':
      return 'early';
    case 'growth-stage':
    case 'growth':
      return 'growth';
    case 'established':
    case 'enterprise':
      return 'late';
    default:
      // Try to infer from common patterns
      if (normalizedStage.includes('early') || normalizedStage.includes('seed') || normalizedStage.includes('series a')) {
        return 'early';
      }
      if (normalizedStage.includes('growth') || normalizedStage.includes('series b') || normalizedStage.includes('series c')) {
        return 'growth';
      }
      if (normalizedStage.includes('late') || normalizedStage.includes('series d') || normalizedStage.includes('public') || normalizedStage.includes('enterprise')) {
        return 'late';
      }
      return null;
  }
}

/**
 * Gets the maturity modifier value for PM Levels calculation
 */
export function getMaturityModifier(maturity: BusinessMaturity | null): number {
  switch (maturity) {
    case 'early':
      return 0.8;
    case 'growth':
      return 1.0;
    case 'late':
      return 1.2;
    default:
      return 1.0; // Default to growth stage
  }
}

/**
 * Formats company scale display for PM Levels evidence
 * Shows company name with maturity/stage if available
 */
export function formatCompanyScale(companyName: string, stage?: string | null, maturity?: string | null): string {
  if (!stage && !maturity) {
    return companyName;
  }
  
  // Prefer maturity if available (more normalized)
  if (maturity) {
    const maturityLabel = maturity === 'early' ? 'Early-stage' : maturity === 'growth' ? 'Growth-stage' : 'Late-stage';
    return `${companyName} (${maturityLabel})`;
  }
  
  // Fall back to stage
  if (stage) {
    const stageLabel = stage === 'startup' ? 'Early-stage' : 
                      stage === 'growth-stage' ? 'Growth-stage' : 
                      stage === 'established' ? 'Late-stage' : 
                      stage === 'enterprise' ? 'Late-stage' : 
                      stage;
    return `${companyName} (${stageLabel})`;
  }
  
  return companyName;
}

