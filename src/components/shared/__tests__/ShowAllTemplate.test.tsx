import { render, screen } from '@testing-library/react';
import { ShowAllTemplate } from '../ShowAllTemplate';

// Mock data for testing
const mockData = [
  { id: '1', name: 'Test Item 1', category: 'A' },
  { id: '2', name: 'Test Item 2', category: 'B' },
];

const mockRenderHeader = () => (
  <tr>
    <th>Name</th>
    <th>Category</th>
  </tr>
);

const mockRenderRow = (item: any) => (
  <tr key={item.id}>
    <td>{item.name}</td>
    <td>{item.category}</td>
  </tr>
);

describe('ShowAllTemplate', () => {
  it('renders with basic props', () => {
    render(
      <ShowAllTemplate
        title="Test Title"
        description="Test Description"
        data={mockData}
        searchPlaceholder="Search..."
        renderHeader={mockRenderHeader}
        renderRow={mockRenderRow}
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders add new button when onAddNew is provided', () => {
    render(
      <ShowAllTemplate
        title="Test Title"
        description="Test Description"
        data={mockData}
        searchPlaceholder="Search..."
        renderHeader={mockRenderHeader}
        renderRow={mockRenderRow}
        onAddNew={() => {}}
        addNewLabel="Add New Item"
      />
    );

    expect(screen.getByText('Add New Item')).toBeInTheDocument();
  });

  it('renders filters when provided', () => {
    const filters = [
      { label: 'Filter 1', value: 'filter1', count: 5 },
      { label: 'Filter 2', value: 'filter2', count: 3 },
    ];

    render(
      <ShowAllTemplate
        title="Test Title"
        description="Test Description"
        data={mockData}
        searchPlaceholder="Search..."
        renderHeader={mockRenderHeader}
        renderRow={mockRenderRow}
        filters={filters}
      />
    );

    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('displays correct item count', () => {
    render(
      <ShowAllTemplate
        title="Test Title"
        description="Test Description"
        data={mockData}
        searchPlaceholder="Search..."
        renderHeader={mockRenderHeader}
        renderRow={mockRenderRow}
      />
    );

    expect(screen.getByText('Showing 2 of 2 items')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(
      <ShowAllTemplate
        title="Test Title"
        description="Test Description"
        data={[]}
        searchPlaceholder="Search..."
        renderHeader={mockRenderHeader}
        renderRow={mockRenderRow}
        emptyStateMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });
});
