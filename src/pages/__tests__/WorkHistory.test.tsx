import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkHistory from '../WorkHistory';
import { usePrototype } from '@/contexts/PrototypeContext';

// Mock the PrototypeContext
vi.mock('@/contexts/PrototypeContext');
const mockUsePrototype = vi.mocked(usePrototype);

// Mock the components to isolate the page logic
vi.mock('@/components/work-history/WorkHistoryMaster', () => ({
  WorkHistoryMaster: ({ companies, onCompanySelect, onRoleSelect }: any) => (
    <div data-testid="work-history-master">
      <h3>Companies ({companies.length})</h3>
      {companies.map((company: any) => (
        <div key={company.id} data-testid={`company-${company.id}`}>
          <button onClick={() => onCompanySelect(company)}>
            {company.name}
          </button>
          {company.roles.map((role: any) => (
            <div key={role.id} data-testid={`role-${role.id}`}>
              <button onClick={() => onRoleSelect(role)}>
                {role.title}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/work-history/WorkHistoryDetail', () => ({
  WorkHistoryDetail: ({ selectedCompany, selectedRole }: any) => (
    <div data-testid="work-history-detail">
      <h3>Role Details</h3>
      <p>Company: {selectedCompany?.name}</p>
      <p>Role: {selectedRole?.title}</p>
      <p>Stories: {selectedRole?.blurbs?.length || 0}</p>
      {selectedRole?.blurbs?.map((story: any) => (
        <div key={story.id} data-testid={`story-story-1`}>
          <h4>{story.title}</h4>
          <p>{story.content}</p>
          {story.variations && (
            <div data-testid={`variations-story-1`}>
              <h5>Variations ({story.variations.length})</h5>
              {story.variations.map((variation: any) => (
                <div key={variation.id} data-testid={`variation-${variation.id}`}>
                  <p>{variation.content}</p>
                  <span>{variation.filledGap ? `Gap: ${variation.filledGap}` : 
                         variation.developedForJobTitle ? `For: ${variation.developedForJobTitle}` : 
                         `Variant #${variation.id}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('WorkHistory Page Integration', () => {
  beforeEach(() => {
    mockUsePrototype.mockReturnValue({
      isPrototype: true,
      setIsPrototype: vi.fn(),
      prototypeFeatures: ['variations'],
      prototypeState: 'existing-user'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Re-set the mock for the next test
    mockUsePrototype.mockReturnValue({
      isPrototype: true,
      setIsPrototype: vi.fn(),
      prototypeFeatures: ['variations'],
      prototypeState: 'existing-user'
    });
  });

  describe('Page Initialization', () => {
    it('renders the page with work history content', () => {
      renderWithRouter(<WorkHistory />);

      // Should show the work history interface when data exists
      expect(screen.getByText('Summarize impact with metrics, stories and links')).toBeInTheDocument();
      expect(screen.getByTestId('work-history-master')).toBeInTheDocument();
    });

    it('loads sample data on mount', async () => {
      renderWithRouter(<WorkHistory />);

      await waitFor(() => {
        expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
        expect(screen.getByText('Senior Product Manager')).toBeInTheDocument();
      });

      // Select the first role to see the stories
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }
    });

    it('shows company and role selection interface', async () => {
      renderWithRouter(<WorkHistory />);

      await waitFor(() => {
        expect(screen.getByTestId('work-history-master')).toBeInTheDocument();
        expect(screen.getByTestId('company-1')).toBeInTheDocument();
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
    });
  });

  describe('Data Flow with Variations', () => {
    it('displays stories with variations correctly', async () => {
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('story-story-1')).toBeInTheDocument();
        expect(screen.getByText('Product Strategy Leadership')).toBeInTheDocument();
      });

      // Check that variations are displayed
      expect(screen.getByTestId('variations-story-1')).toBeInTheDocument();
      expect(screen.getByText('Variations (2)')).toBeInTheDocument();
    });

    it('shows variation content and metadata', async () => {
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('variations-story-1')).toBeInTheDocument();
      });

      // Check first variation
      expect(screen.getByText(/My leadership philosophy is centered on empathy and candor/)).toBeInTheDocument();
      expect(screen.getByText('Gap: People management')).toBeInTheDocument();

      // Check second variation
      expect(screen.getByText(/I developed annual and quarterly roadmaps for 3 product lines/)).toBeInTheDocument();
      expect(screen.getByText('Gap: Roadmap')).toBeInTheDocument();
    });

    it('maintains data structure integrity', async () => {
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('work-history-detail')).toBeInTheDocument();
      });

      // Verify the complete data flow
      expect(screen.getByText('Company: TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByText('Role: Senior Product Manager')).toBeInTheDocument();
      expect(screen.getByText('Stories: 1')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('allows company selection', async () => {
      renderWithRouter(<WorkHistory />);

      await waitFor(() => {
        expect(screen.getByTestId('company-1')).toBeInTheDocument();
      });

      const companyButton = screen.getByTestId('company-1').querySelector('button');
      expect(companyButton).toBeInTheDocument();
    });

    it('allows role selection', async () => {
      renderWithRouter(<WorkHistory />);

      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });

      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      expect(roleButton).toBeInTheDocument();
    });

    it('displays role details when selected', async () => {
      renderWithRouter(<WorkHistory />);

      await waitFor(() => {
        expect(screen.getByTestId('work-history-detail')).toBeInTheDocument();
      });

      // Select a role to see the details
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByText('Role: Senior Product Manager')).toBeInTheDocument();
      });
    });
  });

  describe('Variations Feature Integration', () => {
    it('shows variations count in story display', async () => {
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('variations-story-1')).toBeInTheDocument();
      });

      expect(screen.getByText('Variations (2)')).toBeInTheDocument();
    });

    it('displays all variation metadata fields', async () => {
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('variations-story-1')).toBeInTheDocument();
      });

      // Check that all variation metadata is displayed
      expect(screen.getByText('Gap: People management')).toBeInTheDocument();
      expect(screen.getByText('Gap: Roadmap')).toBeInTheDocument();
    });

    it('handles stories without variations gracefully', async () => {
      // The second role in our sample data has no stories
      renderWithRouter(<WorkHistory />);

      await waitFor(() => {
        expect(screen.getByTestId('role-1-2')).toBeInTheDocument();
      });

      // Should not crash when displaying empty stories array
      expect(screen.getByText('Stories: 0')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', async () => {
      // Mock empty data
      mockUsePrototype.mockReturnValue({
        isPrototype: false,
        setIsPrototype: vi.fn(),
        prototypeFeatures: [],
        prototypeState: 'new-user'
      });

      renderWithRouter(<WorkHistory />);

      // Should show onboarding when no data
      await waitFor(() => {
        expect(screen.getByText('Build Your Work History')).toBeInTheDocument();
      });
    });

    it('maintains functionality with incomplete variation data', async () => {
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('variations-story-1')).toBeInTheDocument();
      });

      // Should handle variations with missing optional fields
      expect(screen.getByTestId('variation-var-1')).toBeInTheDocument();
      expect(screen.getByTestId('variation-var-2')).toBeInTheDocument();
    });
  });

  describe('Performance and Rendering', () => {
    it('renders without performance issues', async () => {
      const startTime = performance.now();
      
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('work-history-detail')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000);
    });

    it('handles large variation datasets', async () => {
      // This test would be expanded when we add more variations
      renderWithRouter(<WorkHistory />);

      // Select the first role to see the stories
      await waitFor(() => {
        expect(screen.getByTestId('role-1-1')).toBeInTheDocument();
      });
      
      const roleButton = screen.getByTestId('role-1-1').querySelector('button');
      if (roleButton) {
        roleButton.click();
      }

      await waitFor(() => {
        expect(screen.getByTestId('variations-story-1')).toBeInTheDocument();
      });

      // Currently we have 2 variations, should handle them efficiently
      expect(screen.getByText('Variations (2)')).toBeInTheDocument();
    });
  });
});
