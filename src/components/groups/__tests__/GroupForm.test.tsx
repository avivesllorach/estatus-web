import { render, screen, fireEvent } from '@testing-library/react';
import { GroupForm } from '../GroupForm';
import { ServerData } from '@/services/api';
import { GroupConfig } from '@/types/group';

const mockServers: ServerData[] = [
  {
    id: 'server-001',
    name: 'ARAGÓ-01',
    ip: '192.168.1.10',
    isOnline: true,
    consecutiveSuccesses: 3,
    consecutiveFailures: 0,
    lastChecked: '2025-11-24T08:30:00Z',
    lastStatusChange: '2025-11-24T07:00:00Z'
  },
  {
    id: 'server-002',
    name: 'ARAGÓ-02',
    ip: '192.168.1.11',
    isOnline: false,
    consecutiveSuccesses: 0,
    consecutiveFailures: 3,
    lastChecked: '2025-11-24T08:30:00Z',
    lastStatusChange: '2025-11-24T07:15:00Z'
  }
];

const mockGroup: GroupConfig = {
  id: 'group-1',
  name: 'ARAGÓ',
  order: 1,
  serverIds: ['server-001']
};

describe('GroupForm', () => {
  const defaultProps = {
    groupId: null,
    servers: mockServers,
    groups: [mockGroup], // Add missing groups prop
    onCancel: jest.fn(),
    onSave: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders add form correctly', () => {
    render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

    expect(screen.getByText('Add New Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Group Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Display Order')).toBeInTheDocument();
    expect(screen.getByText('Assigned Servers')).toBeInTheDocument();
  });

  it('renders edit form correctly', () => {
    render(
      <GroupForm
        {...defaultProps}
        groupId="group-1"
        selectedGroup={mockGroup}
      />
    );

    expect(screen.getByText('Edit Group: ARAGÓ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ARAGÓ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('shows server list with checkboxes', () => {
    render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

    expect(screen.getByText('ARAGÓ-01')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
    expect(screen.getByText('ARAGÓ-02')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.11')).toBeInTheDocument();
  });

  it('shows online/offline status badges', () => {
    render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('validates group name field', async () => {
    render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

    const saveButton = screen.getByText('Save Group');
    fireEvent.click(saveButton);

    expect(screen.getByText('Please fix all validation errors before saving')).toBeInTheDocument();
  });

  it('handles server selection', () => {
    render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

    const aragoCheckbox = screen.getByLabelText('ARAGÓ-01');
    fireEvent.click(aragoCheckbox);

    expect(aragoCheckbox).toBeChecked();
  });

  it('shows empty state when no servers available', () => {
    render(<GroupForm {...defaultProps} servers={[]} groupId="__ADD_MODE__" />);

    expect(screen.getByText('No servers available. Add servers first to assign them to groups.')).toBeInTheDocument();
  });

  // Enhanced Server Assignment Tests
  describe('Enhanced Server Assignment Interface', () => {
    it('renders search input and filter buttons', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      expect(screen.getByLabelText('Search servers')).toBeInTheDocument();
      expect(screen.getByText('All (2)')).toBeInTheDocument();
      expect(screen.getByText('Online (1)')).toBeInTheDocument();
      expect(screen.getByText('Offline (1)')).toBeInTheDocument();
    });

    it('renders keyboard shortcuts help', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      expect(screen.getByText('Shortcuts:')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+F: Search')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Shift+A: Select All')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+A: Deselect All')).toBeInTheDocument();
      expect(screen.getByText('Esc: Clear Filters')).toBeInTheDocument();
    });

    it('filters servers by search term', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const searchInput = screen.getByLabelText('Search servers');
      fireEvent.change(searchInput, { target: { value: 'ARAGÓ-01' } });

      expect(screen.getByText('ARAGÓ-01')).toBeInTheDocument();
      expect(screen.queryByText('ARAGÓ-02')).not.toBeInTheDocument();
    });

    it('filters servers by IP address', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const searchInput = screen.getByLabelText('Search servers');
      fireEvent.change(searchInput, { target: { value: '192.168.1.11' } });

      expect(screen.getByText('ARAGÓ-02')).toBeInTheDocument();
      expect(screen.queryByText('ARAGÓ-01')).not.toBeInTheDocument();
    });

    it('filters servers by status - online only', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const onlineButton = screen.getByText('Online (1)');
      fireEvent.click(onlineButton);

      expect(screen.getByText('ARAGÓ-01')).toBeInTheDocument();
      expect(screen.queryByText('ARAGÓ-02')).not.toBeInTheDocument();
    });

    it('filters servers by status - offline only', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const offlineButton = screen.getByText('Offline (1)');
      fireEvent.click(offlineButton);

      expect(screen.getByText('ARAGÓ-02')).toBeInTheDocument();
      expect(screen.queryByText('ARAGÓ-01')).not.toBeInTheDocument();
    });

    it('shows no results message when no servers match filter', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const searchInput = screen.getByLabelText('Search servers');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No servers match your search criteria')).toBeInTheDocument();
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('shows bulk selection controls', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      expect(screen.getByText('2 servers found')).toBeInTheDocument();
      expect(screen.getByText('Select All')).toBeInTheDocument();
      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });

    it('selects all filtered servers when Select All is clicked', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);

      // Check that the server count shows assigned servers
      expect(screen.getByText('2 servers assigned to this group')).toBeInTheDocument();
    });

    it('deselects all filtered servers when Deselect All is clicked', () => {
      render(<GroupForm {...defaultProps} groupId="group-1" selectedGroup={mockGroup} />);

      // Initially has 1 assigned server
      expect(screen.getByText('1 server assigned to this group')).toBeInTheDocument();

      const deselectAllButton = screen.getByText('Deselect All');
      fireEvent.click(deselectAllButton);

      // Should show no assigned servers message removed
      expect(screen.queryByText(/servers assigned to this group/)).not.toBeInTheDocument();
    });

    it('shows collapsible server groups by status', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      expect(screen.getByText('Online Servers (1)')).toBeInTheDocument();
      expect(screen.getByText('Offline Servers (1)')).toBeInTheDocument();
      expect(screen.getByText('ARAGÓ-01')).toBeInTheDocument();
      expect(screen.getByText('ARAGÓ-02')).toBeInTheDocument();
    });

    it('shows last checked timestamps', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      // Should show relative time for recent checks
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('updates server count in real-time when servers are selected/deselected', () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      // Initially no assigned servers
      expect(screen.queryByText(/servers assigned to this group/)).not.toBeInTheDocument();

      // Select a server
      const serverCheckboxes = screen.getAllByRole('checkbox');
      const firstServerCheckbox = serverCheckboxes.find(checkbox =>
        checkbox.getAttribute('aria-label')?.includes('ARAGÓ-01')
      );
      if (firstServerCheckbox) {
        fireEvent.click(firstServerCheckbox);
        expect(screen.getByText('1 server assigned to this group')).toBeInTheDocument();

        // Deselect the server
        fireEvent.click(firstServerCheckbox);
        expect(screen.queryByText(/servers assigned to this group/)).not.toBeInTheDocument();
      }
    });
  });
});