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

  // Group Name Validation Tests (Story 3.7)
  describe('Group Name Validation', () => {
    it('shows validation error when Group Name field is empty and blurred', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Focus and blur the empty field to trigger validation
      fireEvent.focus(groupNameInput);
      fireEvent.blur(groupNameInput);

      // Should show validation error
      expect(screen.getByText('Group name is required')).toBeInTheDocument();

      // Check if error styling is applied (aria-invalid)
      expect(groupNameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows validation error for duplicate group name (case-insensitive)', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Enter a duplicate name (different case)
      fireEvent.change(groupNameInput, { target: { value: 'aragó' } });
      fireEvent.blur(groupNameInput);

      // Should show duplicate name error
      expect(screen.getByText("Group name 'aragó' already exists. Please choose a different name.")).toBeInTheDocument();
    });

    it('shows validation error for duplicate group name (exact match)', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Enter an exact duplicate name
      fireEvent.change(groupNameInput, { target: { value: 'ARAGÓ' } });
      fireEvent.blur(groupNameInput);

      // Should show duplicate name error
      expect(screen.getByText("Group name 'ARAGÓ' already exists. Please choose a different name.")).toBeInTheDocument();
    });

    it('clears validation error when duplicate name is changed to valid name', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Enter a duplicate name
      fireEvent.change(groupNameInput, { target: { value: 'ARAGÓ' } });
      fireEvent.blur(groupNameInput);

      // Should show error
      expect(screen.getByText(/already exists/)).toBeInTheDocument();

      // Change to a valid name
      fireEvent.change(groupNameInput, { target: { value: 'New Valid Group' } });
      fireEvent.blur(groupNameInput);

      // Error should be cleared
      expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
      expect(groupNameInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('clears validation error when empty field is filled', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Focus and blur empty field to trigger error
      fireEvent.focus(groupNameInput);
      fireEvent.blur(groupNameInput);

      // Should show required error
      expect(screen.getByText('Group name is required')).toBeInTheDocument();

      // Fill in the field
      fireEvent.change(groupNameInput, { target: { value: 'Valid Group Name' } });
      fireEvent.blur(groupNameInput);

      // Error should be cleared
      expect(screen.queryByText('Group name is required')).not.toBeInTheDocument();
      expect(groupNameInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('disables Save button when validation errors exist', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');
      const saveButton = screen.getByText('Save Group');

      // Initially Save button should be disabled due to empty required field
      expect(saveButton).toBeDisabled();

      // Focus and blur empty field to trigger validation
      fireEvent.focus(groupNameInput);
      fireEvent.blur(groupNameInput);

      // Save button should still be disabled due to validation error
      expect(saveButton).toBeDisabled();

      // Fill in a valid name
      fireEvent.change(groupNameInput, { target: { value: 'Valid Group Name' } });
      fireEvent.blur(groupNameInput);

      // Save button should now be enabled
      expect(saveButton).not.toBeDisabled();
    });

    it('disables Save button when duplicate group name exists', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');
      const saveButton = screen.getByText('Save Group');

      // Enter a duplicate name
      fireEvent.change(groupNameInput, { target: { value: 'ARAGÓ' } });
      fireEvent.blur(groupNameInput);

      // Save button should be disabled due to validation error
      expect(saveButton).toBeDisabled();
    });

    it('allows editing existing group with same name (excludes current group from duplicate check)', async () => {
      render(
        <GroupForm
          {...defaultProps}
          groupId="group-1"
          selectedGroup={mockGroup}
        />
      );

      const groupNameInput = screen.getByDisplayValue('ARAGÓ');
      const saveButton = screen.getByText('Save Group');

      // Blur the field without changing the name
      fireEvent.blur(groupNameInput);

      // Should NOT show duplicate error (same group is excluded)
      expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();

      // Save button should be enabled (no validation errors)
      expect(saveButton).not.toBeDisabled();
    });

    it('shows validation error for whitespace-only group name', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Enter only whitespace
      fireEvent.change(groupNameInput, { target: { value: '   ' } });
      fireEvent.blur(groupNameInput);

      // Should show required error (whitespace-only is treated as empty)
      expect(screen.getByText('Group name is required')).toBeInTheDocument();
    });

    it('trims group name correctly for validation', async () => {
      render(<GroupForm {...defaultProps} groupId="__ADD_MODE__" />);

      const groupNameInput = screen.getByLabelText('Group Name *');

      // Enter name with leading/trailing spaces
      fireEvent.change(groupNameInput, { target: { value: '  Valid Group Name  ' } });
      fireEvent.blur(groupNameInput);

      // Should not show error (name is valid after trimming)
      expect(screen.queryByText('Group name is required')).not.toBeInTheDocument();
      expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
    });
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