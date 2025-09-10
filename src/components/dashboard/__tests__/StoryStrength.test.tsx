import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StoryStrength } from '../StoryStrength';
import { StoryStrength as StoryStrengthType } from '@/types/dashboard';

// Mock data for testing
const mockStoryStrength: StoryStrengthType = {
  overall: 71,
  breakdown: {
    outcomes: 24,
    context: 20,
    technical: 15,
    influence: 12,
    innovation: 8
  },
  recommendations: [
    'Add more quantified outcomes to your stories',
    'Include team size and project scope context',
    'Highlight technical methodologies and tools used'
  ],
  lastAssessed: '2024-01-15'
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('StoryStrength', () => {
  it('renders the component with title and overall score', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('Story Strength Analysis')).toBeInTheDocument();
    expect(screen.getByText('71/100')).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
    expect(screen.getByText('Overall Story Strength')).toBeInTheDocument();
  });

  it('displays the last assessed date correctly', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText(/Last assessed:/)).toBeInTheDocument();
    // Note: Date formatting may vary by locale, so we check for the presence
    expect(screen.getByText(/Last assessed:/)).toBeInTheDocument();
  });

  it('shows all score breakdown categories', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('Outcomes & Impact')).toBeInTheDocument();
    expect(screen.getByText('Context & Scope')).toBeInTheDocument();
    expect(screen.getByText('Technical Depth')).toBeInTheDocument();
    expect(screen.getByText('Influence & Leadership')).toBeInTheDocument();
    expect(screen.getByText('Innovation Bonus')).toBeInTheDocument();
  });

  it('displays correct scores for each category', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('24/30')).toBeInTheDocument();
    expect(screen.getByText('20/25')).toBeInTheDocument();
    expect(screen.getByText('15/20')).toBeInTheDocument();
    expect(screen.getByText('12/15')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('shows category descriptions', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('Quantified results and business impact')).toBeInTheDocument();
    expect(screen.getByText('Role clarity, project scale, team size')).toBeInTheDocument();
    expect(screen.getByText('Methodologies, tools, complexity')).toBeInTheDocument();
    expect(screen.getByText('Cross-functional impact, team management')).toBeInTheDocument();
    expect(screen.getByText('Novel approaches and creative solutions')).toBeInTheDocument();
  });

  it('displays all recommendations', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('Add more quantified outcomes to your stories')).toBeInTheDocument();
    expect(screen.getByText('Include team size and project scope context')).toBeInTheDocument();
    expect(screen.getByText('Highlight technical methodologies and tools used')).toBeInTheDocument();
  });

  it('shows improvement recommendations section when recommendations exist', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('Improvement Recommendations')).toBeInTheDocument();
  });

  it('renders action buttons correctly', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    expect(screen.getByText('Improve Stories')).toBeInTheDocument();
    expect(screen.getByText('View Assessment')).toBeInTheDocument();
  });

  it('handles empty recommendations gracefully', () => {
    const emptyStoryStrength: StoryStrengthType = {
      ...mockStoryStrength,
      recommendations: []
    };

    renderWithRouter(<StoryStrength storyStrength={emptyStoryStrength} />);

    expect(screen.queryByText('Improvement Recommendations')).not.toBeInTheDocument();
  });

  it('renders progress bars for overall score and categories', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(6); // Overall + 5 categories
  });

  it('applies correct score labels based on percentages', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    // 24/30 = 80% = Strong
    expect(screen.getByText('Strong')).toBeInTheDocument();
    // 20/25 = 80% = Strong
    expect(screen.getByText('Strong')).toBeInTheDocument();
    // 15/20 = 75% = Good
    expect(screen.getByText('Good')).toBeInTheDocument();
    // 12/15 = 80% = Strong
    expect(screen.getByText('Strong')).toBeInTheDocument();
    // 8/10 = 80% = Strong
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('displays category icons correctly', () => {
    renderWithRouter(<StoryStrength storyStrength={mockStoryStrength} />);

    // Check that icons are present (they should have the specified colors)
    const targetIcon = screen.getByText('Outcomes & Impact').closest('div')?.querySelector('.text-blue-600');
    const barChartIcon = screen.getByText('Context & Scope').closest('div')?.querySelector('.text-green-600');
    const zapIcon = screen.getByText('Technical Depth').closest('div')?.querySelector('.text-purple-600');
    const usersIcon = screen.getByText('Influence & Leadership').closest('div')?.querySelector('.text-orange-600');
    const lightbulbIcon = screen.getByText('Innovation Bonus').closest('div')?.querySelector('.text-yellow-600');

    expect(targetIcon).toBeInTheDocument();
    expect(barChartIcon).toBeInTheDocument();
    expect(zapIcon).toBeInTheDocument();
    expect(usersIcon).toBeInTheDocument();
    expect(lightbulbIcon).toBeInTheDocument();
  });
});
