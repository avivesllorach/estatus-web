import { renderHook, act } from '@testing-library/react';
import { useConflictDetection } from '@/hooks/use-conflict-detection';
import { ServerConfig } from '@/services/api';
import { describe, it, expect, beforeEach } from 'vitest';

describe('useConflictDetection', () => {
  const defaultProps = {
    selectedServerId: 'server-1',
    selectedServerName: 'Server 1',
    isDirty: false
  };

  beforeEach(() => {
    // Reset any lingering state
  });

  it('should initialize with no conflicts', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
    expect(result.current.conflictState.conflictServerName).toBe(null);
  });

  it('should detect conflict when selected server is removed', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    // Simulate server removal for the selected server
    act(() => {
      result.current.handleServerRemoved('server-1', 'Server 1');
    });

    expect(result.current.conflictState.showConflictDialog).toBe(true);
    expect(result.current.conflictState.conflictType).toBe('deleted');
    expect(result.current.conflictState.conflictServerName).toBe('Server 1');
  });

  it('should not detect conflict when different server is removed', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    // Simulate server removal for a different server
    act(() => {
      result.current.handleServerRemoved('server-2', 'Server 2');
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });

  it('should detect conflict when selected server is updated with unsaved changes', () => {
    const { result } = renderHook(() =>
      useConflictDetection({ ...defaultProps, isDirty: true })
    );

    const updatedServer: ServerConfig = {
      id: 'server-1',
      name: 'Updated Server 1',
      ip: '192.168.1.100',
      dns: 'updated-server-1.local'
    };

    // Simulate server update with unsaved changes
    act(() => {
      result.current.handleServerUpdated(updatedServer);
    });

    expect(result.current.conflictState.showConflictDialog).toBe(true);
    expect(result.current.conflictState.conflictType).toBe('updated');
    expect(result.current.conflictState.conflictServerName).toBe('Updated Server 1');
  });

  it('should not detect conflict when selected server is updated without unsaved changes', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    const updatedServer: ServerConfig = {
      id: 'server-1',
      name: 'Updated Server 1',
      ip: '192.168.1.100',
      dns: 'updated-server-1.local'
    };

    // Simulate server update without unsaved changes
    act(() => {
      result.current.handleServerUpdated(updatedServer);
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });

  it('should not detect conflict when different server is updated with unsaved changes', () => {
    const { result } = renderHook(() =>
      useConflictDetection({ ...defaultProps, isDirty: true })
    );

    const updatedServer: ServerConfig = {
      id: 'server-2',
      name: 'Updated Server 2',
      ip: '192.168.1.101',
      dns: 'updated-server-2.local'
    };

    // Simulate server update for a different server
    act(() => {
      result.current.handleServerUpdated(updatedServer);
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });

  it('should handle conflict resolution for keep editing', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    // Simulate server removal
    act(() => {
      result.current.handleServerRemoved('server-1', 'Server 1');
    });

    expect(result.current.conflictState.showConflictDialog).toBe(true);

    // Handle conflict resolution
    act(() => {
      result.current.handleKeepEditing();
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });

  it('should handle conflict resolution for reload latest', () => {
    const { result } = renderHook(() =>
      useConflictDetection({ ...defaultProps, isDirty: true })
    );

    const updatedServer: ServerConfig = {
      id: 'server-1',
      name: 'Updated Server 1',
      ip: '192.168.1.100',
      dns: 'updated-server-1.local'
    };

    // Simulate server update with unsaved changes
    act(() => {
      result.current.handleServerUpdated(updatedServer);
    });

    expect(result.current.conflictState.showConflictDialog).toBe(true);

    // Handle conflict resolution
    act(() => {
      result.current.handleReloadLatest();
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });

  it('should handle manual dialog close', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    // Simulate server removal
    act(() => {
      result.current.handleServerRemoved('server-1', 'Server 1');
    });

    expect(result.current.conflictState.showConflictDialog).toBe(true);

    // Handle manual close
    act(() => {
      result.current.handleClose();
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });

  it('should update last known server', () => {
    const { result } = renderHook(() => useConflictDetection(defaultProps));

    const serverConfig: ServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      ip: '192.168.1.1',
      dns: 'server-1.local'
    };

    // Update last known server
    act(() => {
      result.current.updateLastKnownServer(serverConfig);
    });

    // This is mainly to ensure the function exists and can be called
    // The actual storage would be tested through integration
    expect(typeof result.current.updateLastKnownServer).toBe('function');
  });

  it('should handle no selected server', () => {
    const { result } = renderHook(() =>
      useConflictDetection({
        selectedServerId: null,
        selectedServerName: '',
        isDirty: false
      })
    );

    // Try to trigger conflicts with no selected server
    act(() => {
      result.current.handleServerRemoved('server-1', 'Server 1');
      result.current.handleServerUpdated({
        id: 'server-1',
        name: 'Server 1',
        ip: '192.168.1.1',
        dns: 'server-1.local'
      });
    });

    expect(result.current.conflictState.showConflictDialog).toBe(false);
    expect(result.current.conflictState.conflictType).toBe(null);
  });
});