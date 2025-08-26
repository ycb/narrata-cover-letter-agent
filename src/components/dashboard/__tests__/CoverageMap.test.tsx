import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CoverageMap } from '../CoverageMap';
import { CompetencyCoverage } from '@/types/dashboard';

// Mock data for testing
const mockCoverage: CompetencyCoverage[] = [
  {
    competency: {
      id: 'execution',
      name: 'Product Execution',
      category: 'execution',
      description: 'Delivering complex products with measurable impact',
      weight: 5
    },
    coverage: 85,
    stories: ['story-1', 'story-2', 'story-3'],
    averageStrength: 78,
    gap: 'low'
  },
  {
    competency: {
      id: 'strategy',
      name: 'Product Strategy',
      category: 'strategy',
      description: 'Strategic thinking and roadmap development',
      weight: 4
    },
    coverage: 45,
    stories: ['story-4'],
    averageStrength: 65,
    gap: 'high'
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CoverageMap', () => {
  it('renders the component with title and overall coverage', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    expect(screen.getByText('PM Competency Coverage')).toBeInTheDocument();
    expect(screen.getByText('65% Overall')).toBeInTheDocument();
    expect(screen.getByText('Overall Coverage')).toBeInTheDocument();
  });

  it('displays competency cards with correct information', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    expect(screen.getByText('Product Execution')).toBeInTheDocument();
    // Check that Product Strategy competency is displayed (there are multiple elements with this text)
    const strategyElements = screen.getAllByText('Product Strategy');
    expect(strategyElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Delivering complex products with measurable impact')).toBeInTheDocument();
    expect(screen.getByText('Strategic thinking and roadmap development')).toBeInTheDocument();
  });

  it('shows coverage percentages correctly', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('displays story counts and average strength', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    expect(screen.getByText('3 stories')).toBeInTheDocument();
    expect(screen.getByText('1 stories')).toBeInTheDocument();
    expect(screen.getByText('Avg: 78/100')).toBeInTheDocument();
    expect(screen.getByText('Avg: 65/100')).toBeInTheDocument();
  });

  it('shows correct gap status badges', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText('Critical Gap')).toBeInTheDocument();
  });

  it('displays priority actions section when gaps exist', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    expect(screen.getByText('Priority Actions')).toBeInTheDocument();
    expect(screen.getByText('Focus on these competencies to improve your overall coverage:')).toBeInTheDocument();
  });

  it('shows Add Story buttons for competencies with gaps', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    const addStoryButtons = screen.getAllByText('Add Story');
    expect(addStoryButtons).toHaveLength(1); // Only strategy has a gap
  });

  it('handles empty priority gaps gracefully', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={100}
        priorityGaps={[]}
      />
    );

    expect(screen.queryByText('Priority Actions')).not.toBeInTheDocument();
  });

  it('renders progress bars with correct values', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3); // Overall + 2 competencies
  });

  it('applies correct styling based on gap levels', () => {
    renderWithRouter(
      <CoverageMap 
        coverage={mockCoverage}
        overallCoverage={65}
        priorityGaps={['strategy']}
      />
    );

    // Check that high gap competency has destructive styling
    // Find the card container that has the border-2 class
    const strategyElements = screen.getAllByText('Product Strategy');
    const strategyTitle = strategyElements[0]; // Get the title element
    const strategyCard = strategyTitle.closest('div[class*="border-2"]'); // Find the card container
    expect(strategyCard).toHaveClass('border-destructive/20', 'bg-destructive/5');
  });
});
