import { useState, useRef, useCallback } from 'react';
import { ServerData, ServerConfig } from '@/services/api';

interface ConflictDetectionState {
  showConflictDialog: boolean;
  conflictType: 'deleted' | 'updated' | null;
  conflictServerName: string | null;
  onConflictResolve?: () => void;
}

interface UseConflictDetectionProps {
  selectedServerId: string | null;
  selectedServerName: string | null;
  isDirty: boolean;
}

export function useConflictDetection({
  selectedServerId,
  selectedServerName,
  isDirty
}: UseConflictDetectionProps) {
  const [conflictState, setConflictState] = useState<ConflictDetectionState>({
    showConflictDialog: false,
    conflictType: null,
    conflictServerName: null,
    onConflictResolve: undefined
  });

  // Track last known server data for conflict detection
  const lastKnownServer = useRef<ServerConfig | null>(null);

  // Update last known server when server data changes
  const updateLastKnownServer = useCallback((server: ServerConfig | null) => {
    lastKnownServer.current = server;
  }, []);

  // Handle serverRemoved SSE event
  const handleServerRemoved = useCallback((serverId: string, serverName: string) => {
    // Check if this is the currently selected server
    if (selectedServerId === serverId) {
      setConflictState({
        showConflictDialog: true,
        conflictType: 'deleted',
        conflictServerName: serverName,
        onConflictResolve: () => {
          // Clear form and selection after user acknowledges
          setConflictState({
            showConflictDialog: false,
            conflictType: null,
            conflictServerName: null,
            onConflictResolve: undefined
          });
        }
      });
    }
  }, [selectedServerId]);

  // Handle serverUpdated SSE event
  const handleServerUpdated = useCallback((server: ServerConfig) => {
    // Check if this is the currently selected server
    if (selectedServerId === server.id && isDirty) {
      // There are unsaved changes, show conflict warning
      setConflictState({
        showConflictDialog: true,
        conflictType: 'updated',
        conflictServerName: server.name,
        onConflictResolve: () => {
          setConflictState({
            showConflictDialog: false,
            conflictType: null,
            conflictServerName: null,
            onConflictResolve: undefined
          });
        }
      });
    } else {
      // Update last known server data for future conflict detection
      lastKnownServer.current = server;
    }
  }, [selectedServerId, isDirty]);

  // Dialog action handlers
  const handleKeepEditing = useCallback(() => {
    if (conflictState.onConflictResolve) {
      conflictState.onConflictResolve();
    }
  }, [conflictState.onConflictResolve]);

  const handleReloadLatest = useCallback(() => {
    if (conflictState.onConflictResolve) {
      conflictState.onConflictResolve();
      // Note: The parent component should handle the actual reload
    }
  }, [conflictState.onConflictResolve]);

  const handleClose = useCallback(() => {
    setConflictState({
      showConflictDialog: false,
      conflictType: null,
      conflictServerName: null,
      onConflictResolve: undefined
    });
  }, []);

  return {
    conflictState,
    updateLastKnownServer,
    handleServerRemoved,
    handleServerUpdated,
    handleKeepEditing,
    handleReloadLatest,
    handleClose
  };
}