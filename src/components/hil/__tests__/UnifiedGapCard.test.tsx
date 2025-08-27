import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedGapCard } from '../UnifiedGapCard';

describe('UnifiedGapCard', () => {
  const mockGapProps = {
    status: 'gap' as const,
    title: 'Test Gap',
    issue: 'This is a test issue',
    suggestion: 'This is a test suggestion',
    origin: 'ai' as const,
    paragraphId: 'intro',
    severity: 'medium' as const,
    onEdit: jest.fn(),
    onGenerate: jest.fn(),
  };

  const mockMetProps = {
    status: 'met' as const,
    title: 'Test Met',
    addresses: ['requirement 1', 'requirement 2'],
    origin: 'human' as const,
    paragraphId: 'experience',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Gap Status Rendering', () => {
    it('renders gap card with correct styling and content', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      expect(screen.getByText('Issue')).toBeInTheDocument();
      expect(screen.getByText('This is a test issue')).toBeInTheDocument();
      expect(screen.getByText('This is a test suggestion')).toBeInTheDocument();
      expect(screen.getByText('Needs Action')).toBeInTheDocument();
      expect(screen.getByText('medium priority')).toBeInTheDocument();
      expect(screen.getByText('intro')).toBeInTheDocument();
    });

    it('shows action buttons for gap status', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('calls onEdit when Edit button is clicked', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      expect(mockGapProps.onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onGenerate when Generate button is clicked', () => {
      render(<UnifiedGapCard {...mockGapProps} />);
      
      fireEvent.click(screen.getByText('Generate'));
      expect(mockGapProps.onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Met Status Rendering', () => {
    it('renders met card with correct styling and content', () => {
      render(<UnifiedGapCard {...mockMetProps} />);
      
      expect(screen.getByText('Requirement Met')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('experience')).toBeInTheDocument();
      expect(screen.getByText('requirement 1, requirement 2')).toBeInTheDocument();
    });

    it('does not show action buttons for met status', () => {
      render(<UnifiedGapCard {...mockMetProps} />);
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Generate')).not.toBeInTheDocument();
    });
  });

  describe('Origin Tags', () => {
    it('renders AI origin tag correctly', () => {
      render(<UnifiedGapCard {...mockGapProps} origin="ai" />);
      
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('renders Human origin tag correctly', () => {
      render(<UnifiedGapCard {...mockGapProps} origin="human" />);
      
      expect(screen.getByText('Human')).toBeInTheDocument();
    });

    it('renders Library origin tag correctly', () => {
      render(<UnifiedGapCard {...mockGapProps} origin="library" />);
      
      expect(screen.getByText('Library')).toBeInTheDocument();
    });
  });

  describe('Severity Levels', () => {
    it('renders high severity with correct styling', () => {
      render(<UnifiedGapCard {...mockGapProps} severity="high" />);
      
      expect(screen.getByText('high priority')).toBeInTheDocument();
    });

    it('renders low severity with correct styling', () => {
      render(<UnifiedGapCard {...mockGapProps} severity="low" />);
      
      expect(screen.getByText('low priority')).toBeInTheDocument();
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
      expect(screen.getByText('Needs Action')).toBeInTheDocument();
    });

    it('renders without action handlers', () => {
      const propsWithoutHandlers = {
        ...mockGapProps,
        onEdit: undefined,
        onGenerate: undefined,
      };
      
      render(<UnifiedGapCard {...propsWithoutHandlers} />);
      
      // Should still render the card but without buttons
      expect(screen.getByText('Issue')).toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Generate')).not.toBeInTheDocument();
    });
  });

  describe('Paragraph ID Formatting', () => {
    it('formats paragraph ID correctly', () => {
      render(<UnifiedGapCard {...mockGapProps} paragraphId="work-experience" />);
      
      expect(screen.getByText('work experience')).toBeInTheDocument();
    });
  });
});
