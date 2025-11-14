import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { UnifiedGapCard } from '../UnifiedGapCard';

describe('UnifiedGapCard', () => {
  const mockGapProps = {
    status: 'gap' as const,
    title: 'Test Gap',
    issue: 'This is a test issue',
    suggestion: 'This is a test suggestion',
    origin: 'ai' as const,
    paragraphId: 'intro',
    onGenerate: vi.fn(),
  };

  const mockMetProps = {
    status: 'met' as const,
    title: 'Test Met',
    addresses: ['requirement 1', 'requirement 2'],
    origin: 'human' as const,
    paragraphId: 'experience',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Gap Status Rendering', () => {
    it('renders gap card with issue details', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      expect(screen.getByText('Issue')).toBeInTheDocument();
      expect(screen.getByText(/Issue:/)).toBeInTheDocument();
      expect(screen.getByText(/Suggestion:/)).toBeInTheDocument();
      expect(screen.getByText('This is a test issue')).toBeInTheDocument();
      expect(screen.getByText('This is a test suggestion')).toBeInTheDocument();
    });

    it('shows generate action when handler provided', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      expect(screen.getByText('Generate Content')).toBeInTheDocument();
    });

    it('calls onGenerate when the button is clicked', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      fireEvent.click(screen.getByText('Generate Content'));
      expect(mockGapProps.onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Met Status Rendering', () => {
    it('renders met card with addressed requirements', () => {
      render(<UnifiedGapCard {...mockMetProps} />);
      
      expect(screen.getByText('Matches Job Req')).toBeInTheDocument();
      expect(screen.getByText('requirement 1')).toBeInTheDocument();
      expect(screen.getByText('requirement 2')).toBeInTheDocument();
    });

    it('does not show generate action for met status', () => {
      render(<UnifiedGapCard {...mockMetProps} />);
      
      expect(screen.queryByText('Generate Content')).not.toBeInTheDocument();
    });
  });

  describe('Optional Props', () => {
    it('renders without optional props', () => {
      const minimalProps = {
        status: 'gap' as const,
        title: 'Minimal',
        origin: 'ai' as const,
        paragraphId: 'intro',
      };
      
      render(<UnifiedGapCard {...minimalProps} />);
      
      expect(screen.getByText('Issue')).toBeInTheDocument();
    });

    it('renders without action handlers', () => {
      const propsWithoutHandlers = {
        ...mockGapProps,
        onGenerate: undefined,
      };
      
      render(<UnifiedGapCard {...propsWithoutHandlers} />);
      
      expect(screen.getByText('Issue')).toBeInTheDocument();
      expect(screen.queryByText('Generate Content')).not.toBeInTheDocument();
    });
  });
});
