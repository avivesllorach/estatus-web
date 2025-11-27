/**
 * SNMP Configuration Section Frontend Tests
 *
 * Tests for the fix in Story 4.8: Fix SNMP Configuration Validation for Existing Servers
 * Tests the frontend component's behavior when handling existing servers without SNMP configuration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SNMPConfigSection } from '../SNMPConfigSection';
import { SnmpConfig, DiskConfig } from '@/types/server';

// Mock the UI components that might not be directly testable
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('SNMPConfigSection', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Initial state handling', () => {
    test('should render correctly when snmpConfig is undefined', () => {
      render(<SNMPConfigSection snmpConfig={undefined} onChange={mockOnChange} />);

      // SNMP should be disabled by default
      expect(screen.getByLabelText(/Enable SNMP monitoring/i)).not.toBeChecked();

      // Community string should default to 'public' but be disabled
      const communityInput = screen.getByLabelText(/Community String/i);
      expect(communityInput).toHaveValue('public');
      expect(communityInput).toBeDisabled();

      // Storage indexes should be empty and disabled
      const storageInput = screen.getByLabelText(/Storage Indexes/i);
      expect(storageInput).toHaveValue('');
      expect(storageInput).toBeDisabled();
    });

    test('should render correctly when snmpConfig is null', () => {
      render(<SNMPConfigSection snmpConfig={null} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Enable SNMP monitoring/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Community String/i)).toHaveValue('public');
    });

    test('should render correctly when snmpConfig is enabled', () => {
      const enabledConfig: SnmpConfig = {
        enabled: true,
        community: 'secret',
        storageIndexes: [1, 2, 3],
        disks: [{ index: 1, name: 'C:' }]
      };

      render(<SNMPConfigSection snmpConfig={enabledConfig} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Enable SNMP monitoring/i)).toBeChecked();
      expect(screen.getByLabelText(/Community String/i)).toHaveValue('secret');
      expect(screen.getByLabelText(/Storage Indexes/i)).toHaveValue('1,2,3');
      expect(screen.getByLabelText(/Custom Name/i)).toHaveValue('C:');
    });

    test('should render correctly when snmpConfig is disabled', () => {
      const disabledConfig: SnmpConfig = {
        enabled: false,
        community: 'old-secret',
        storageIndexes: [1, 2],
        disks: [{ index: 1, name: 'C:' }]
      };

      render(<SNMPConfigSection snmpConfig={disabledConfig} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Enable SNMP monitoring/i)).not.toBeChecked();

      // Fields should retain their values but be disabled
      expect(screen.getByLabelText(/Community String/i)).toHaveValue('old-secret');
      expect(screen.getByLabelText(/Community String/i)).toBeDisabled();
      expect(screen.getByLabelText(/Storage Indexes/i)).toHaveValue('1,2');
      expect(screen.getByLabelText(/Storage Indexes/i)).toBeDisabled();
    });
  });

  describe('SNMP enable/disable transitions', () => {
    test('should handle transition from undefined to enabled', async () => {
      const user = userEvent.setup();
      render(<SNMPConfigSection snmpConfig={undefined} onChange={mockOnChange} />);

      // Enable SNMP
      const enableCheckbox = screen.getByLabelText(/Enable SNMP monitoring/i);
      await user.click(enableCheckbox);

      // Should call onChange with enabled config
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const calledConfig = mockOnChange.mock.calls[0][0] as SnmpConfig;
      expect(calledConfig.enabled).toBe(true);
      expect(calledConfig.community).toBe('public'); // Default value
      expect(calledConfig.storageIndexes).toEqual([]); // Empty array from empty string
      expect(calledConfig.disks).toEqual([]); // Empty array
    });

    test('should handle transition from disabled to enabled', async () => {
      const user = userEvent.setup();
      const disabledConfig: SnmpConfig = {
        enabled: false,
        community: 'old-secret',
        storageIndexes: [1, 2],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={disabledConfig} onChange={mockOnChange} />);

      // Enable SNMP
      const enableCheckbox = screen.getByLabelText(/Enable SNMP monitoring/i);
      await user.click(enableCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        enabled: true,
        community: 'old-secret', // Should preserve existing value
        storageIndexes: [1, 2], // Should preserve existing value
        disks: []
      });
    });

    test('should handle transition from enabled to disabled', async () => {
      const user = userEvent.setup();
      const enabledConfig: SnmpConfig = {
        enabled: true,
        community: 'secret',
        storageIndexes: [1, 2, 3],
        disks: [{ index: 1, name: 'C:' }]
      };

      render(<SNMPConfigSection snmpConfig={enabledConfig} onChange={mockOnChange} />);

      // Disable SNMP
      const enableCheckbox = screen.getByLabelText(/Enable SNMP monitoring/i);
      await user.click(enableCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        enabled: false,
        community: 'secret',
        storageIndexes: [1, 2, 3],
        disks: [{ index: 1, name: 'C:' }]
      });
    });
  });

  describe('Form input handling', () => {
    test('should handle community string changes', async () => {
      const user = userEvent.setup();
      const initialConfig: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={initialConfig} onChange={mockOnChange} />);

      const communityInput = screen.getByLabelText(/Community String/i);
      await user.clear(communityInput);
      await user.type(communityInput, 'new-community');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            community: 'new-community'
          })
        );
      });
    });

    test('should handle storage indexes changes', async () => {
      const user = userEvent.setup();
      const initialConfig: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [1, 2],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={initialConfig} onChange={mockOnChange} />);

      const storageInput = screen.getByLabelText(/Storage Indexes/i);
      await user.clear(storageInput);
      await user.type(storageInput, '1,2,3,4');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            storageIndexes: [1, 2, 3, 4]
          })
        );
      });
    });

    test('should handle empty storage indexes', async () => {
      const user = userEvent.setup();
      const initialConfig: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [1, 2],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={initialConfig} onChange={mockOnChange} />);

      const storageInput = screen.getByLabelText(/Storage Indexes/i);
      await user.clear(storageInput);
      // Leave empty

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            storageIndexes: [] // Should be empty array
          })
        );
      });
    });

    test('should handle invalid storage indexes gracefully', async () => {
      const user = userEvent.setup();
      const initialConfig: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={initialConfig} onChange={mockOnChange} />);

      const storageInput = screen.getByLabelText(/Storage Indexes/i);
      await user.type(storageInput, '1,invalid,3');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            storageIndexes: [1, 3] // Should filter out invalid values
          })
        );
      });
    });
  });

  describe('Disk configuration handling', () => {
    test('should add disk mapping', async () => {
      const user = userEvent.setup();
      const initialConfig: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={initialConfig} onChange={mockOnChange} />);

      const addDiskButton = screen.getByRole('button', { name: /Add Disk/i });
      await user.click(addDiskButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          disks: [{ index: 0, name: '' }]
        })
      );
    });

    test('should remove disk mapping', async () => {
      const user = userEvent.setup();
      const configWithDisk: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [],
        disks: [{ index: 1, name: 'C:' }, { index: 2, name: 'D:' }]
      };

      render(<SNMPConfigSection snmpConfig={configWithDisk} onChange={mockOnChange} />);

      // Remove the second disk
      const removeButtons = screen.getAllByRole('button', { name: /Remove disk mapping/i });
      await user.click(removeButtons[1]);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          disks: [{ index: 1, name: 'C:' }] // Should keep only the first disk
        })
      );
    });

    test('should update disk mapping', async () => {
      const user = userEvent.setup();
      const configWithDisk: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [],
        disks: [{ index: 1, name: 'C:' }]
      };

      render(<SNMPConfigSection snmpConfig={configWithDisk} onChange={mockOnChange} />);

      const indexInput = screen.getByLabelText(/Index/i);
      const nameInput = screen.getByLabelText(/Custom Name/i);

      await user.clear(indexInput);
      await user.type(indexInput, '2');
      await user.clear(nameInput);
      await user.type(nameInput, 'D:');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            disks: [{ index: 2, name: 'D:' }]
          })
        );
      });
    });
  });

  describe('Field disable states', () => {
    test('should disable all fields when SNMP is disabled', () => {
      render(<SNMPConfigSection snmpConfig={undefined} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Community String/i)).toBeDisabled();
      expect(screen.getByLabelText(/Storage Indexes/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Add Disk/i })).toBeDisabled();
    });

    test('should enable all fields when SNMP is enabled', () => {
      const enabledConfig: SnmpConfig = {
        enabled: true,
        community: 'public',
        storageIndexes: [],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={enabledConfig} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Community String/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/Storage Indexes/i)).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /Add Disk/i })).not.toBeDisabled();
    });

    test('should handle state changes correctly', async () => {
      const user = userEvent.setup();
      const disabledConfig: SnmpConfig = {
        enabled: false,
        community: 'public',
        storageIndexes: [1, 2],
        disks: []
      };

      render(<SNMPConfigSection snmpConfig={disabledConfig} onChange={mockOnChange} />);

      // Initially disabled
      expect(screen.getByLabelText(/Community String/i)).toBeDisabled();

      // Enable SNMP
      const enableCheckbox = screen.getByLabelText(/Enable SNMP monitoring/i);
      await user.click(enableCheckbox);

      // Should now be enabled
      expect(screen.getByLabelText(/Community String/i)).not.toBeDisabled();
    });
  });
});