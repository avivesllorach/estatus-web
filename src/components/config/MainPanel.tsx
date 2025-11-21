import { ReactNode, useState, useEffect, useMemo, useRef } from 'react';
import { EmptyState } from './EmptyState';
import { PanelHeader } from './PanelHeader';
import { BasicServerInfoSection } from './forms/server/BasicServerInfoSection';
import { SNMPConfigSection } from './forms/server/SNMPConfigSection';
import { NetAppConfigSection } from './forms/server/NetAppConfigSection';
import { CollapsibleConfigSection } from './forms/shared/CollapsibleConfigSection';
import { ServerConfig, SnmpConfig, NetAppConfig } from '@/types/server';
import { configApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Helper function to create empty server config template
function createEmptyServerConfig(): Partial<ServerConfig> {
  return {
    id: '',
    name: '',
    ip: '',
    dns: '',
    snmp: {
      enabled: false,
      storageIndexes: [],
      disks: []
    },
    netapp: {
      enabled: false,
      apiType: 'rest',
      username: '',
      password: '',
      luns: []
    }
  };
}

interface MainPanelProps {
  selectedServerId: string | null;
  selectedGroupId: string | null;
  selectedServerName?: string | null;
  selectedServer?: ServerConfig | null;
  children?: ReactNode;
  onNavigationRequest?: (targetId: string, type: 'server' | 'group' | 'add-server') => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
}

export function MainPanel({
  selectedServerId,
  selectedGroupId,
  selectedServerName,
  selectedServer,
  onNavigationRequest
}: MainPanelProps) {
  const { toast } = useToast();

  // Determine mode based on selectedServerId
  const isAddMode = selectedServerId === '__ADD_MODE__';
  const isEditMode = selectedServerId !== null && selectedServerId !== '__ADD_MODE__';

  // Form state for server editing/adding
  const [formData, setFormData] = useState<Partial<ServerConfig>>({
    id: selectedServer?.id || '',
    name: selectedServer?.name || '',
    ip: selectedServer?.ip || '',
    dns: selectedServer?.dns || '',
    snmp: selectedServer?.snmp,
    netapp: selectedServer?.netapp
  });

  // Initial data for dirty state tracking
  const [initialData, setInitialData] = useState<Partial<ServerConfig>>({
    id: selectedServer?.id || '',
    name: selectedServer?.name || '',
    ip: selectedServer?.ip || '',
    dns: selectedServer?.dns || '',
    snmp: selectedServer?.snmp,
    netapp: selectedServer?.netapp
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Unsaved changes confirmation dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Ref for auto-focus on Server ID field in add mode
  const serverIdInputRef = useRef<HTMLInputElement>(null);

  // Track if we should skip showing unsaved dialog (after user makes a choice)
  const skipUnsavedCheck = useRef(false);

  // Track previous selectedServerId to detect navigation attempts
  const previousServerId = useRef(selectedServerId);

  // Compute dirty state (has unsaved changes) - MUST be before useEffect that uses it
  const isDirty = useMemo(() => {
    if (!initialData || !formData) return false;
    return JSON.stringify(initialData) !== JSON.stringify(formData);
  }, [initialData, formData]);

  // Detect navigation attempt and show unsaved warning if needed
  useEffect(() => {
    const prev = previousServerId.current;
    const current = selectedServerId;

    // Check if selectedServerId is changing (navigation attempt)
    if (prev !== current && prev !== null && !skipUnsavedCheck.current) {
      // Navigation is being attempted from a previously loaded form
      if (isDirty && formData) {
        // Form is dirty, show warning
        const navType = current === '__ADD_MODE__' ? 'add-server' :
                       current?.startsWith('group-') ? 'group' : 'server';
        setPendingNavigation(`${prev}:${navType}`); // Store PREVIOUS id to go back if canceled
        setShowUnsavedDialog(true);
        // Note: We continue loading the new form, but user can cancel back
      }
    }

    // Reset skip flag
    skipUnsavedCheck.current = false;

    // Update previousServerId for next comparison
    previousServerId.current = current;

    // Proceed with loading new data
    if (isAddMode) {
      // Add mode: clear form with empty template
      const emptyData = createEmptyServerConfig();
      setFormData(emptyData);
      setInitialData(emptyData);
      setValidationErrors({});
    } else if (selectedServer) {
      // Edit mode: load server data
      const serverData = {
        id: selectedServer.id,
        name: selectedServer.name,
        ip: selectedServer.ip,
        dns: selectedServer.dns,
        snmp: selectedServer.snmp,
        netapp: selectedServer.netapp
      };
      setFormData(serverData);
      setInitialData(serverData);
    }
  }, [isAddMode, selectedServer?.id, selectedServerId, isDirty, formData]);

  // Auto-focus Server ID field when entering add mode
  useEffect(() => {
    if (isAddMode && serverIdInputRef.current) {
      serverIdInputRef.current.focus();
    }
  }, [isAddMode]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleValidationChange = (errors: Record<string, string | null>) => {
    setValidationErrors(errors);
  };

  const handleSNMPChange = (snmpConfig: SnmpConfig) => {
    setFormData(prev => ({ ...prev, snmp: snmpConfig }));
  };

  const handleNetAppChange = (netappConfig: NetAppConfig) => {
    setFormData(prev => ({ ...prev, netapp: netappConfig }));
  };

  // Save handler for editing existing server
  const handleSaveExisting = async () => {
    // Don't save if there are validation errors
    if (hasErrors) {
      toast({
        variant: 'destructive',
        title: 'Validation errors',
        description: 'Please fix all validation errors before saving',
        duration: Infinity, // Persist until user dismisses
      });
      return;
    }

    // Don't save if no server selected
    if (!selectedServerId || !formData.id) {
      toast({
        variant: 'destructive',
        title: 'No server selected',
        description: 'Please select a server to edit',
        duration: Infinity, // Persist until user dismisses
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call API to save server
      await configApi.updateServer(selectedServerId, formData as any);

      // Update initialData to mark form as clean
      setInitialData(formData);

      // Show success toast
      toast({
        title: 'Server saved',
        description: `${formData.name} configuration updated successfully`,
        duration: 3000, // Auto-dismiss after 3 seconds (AC #6)
      });
    } catch (error) {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save server configuration',
        duration: Infinity, // Persist until manually dismissed (AC #10)
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save handler for adding new server
  const handleSaveNewServer = async () => {
    // Don't save if there are validation errors
    if (hasErrors) {
      toast({
        variant: 'destructive',
        title: 'Validation errors',
        description: 'Please fix all validation errors before saving',
        duration: Infinity,
      });
      return;
    }

    // Don't save if required fields are empty
    if (!formData.name || !formData.ip || !formData.dns) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Please fill in all required fields (Server Name, IP Address, DNS Address)',
        duration: Infinity,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call API to create server
      const newServer = await configApi.createServer(formData as any);

      // Show success toast
      toast({
        title: 'Server added successfully',
        description: `${newServer.name} has been added to monitoring`,
        duration: 3000, // Auto-dismiss after 3 seconds
      });

      // Clear form for another add (AC #12 - implementation choice A)
      const emptyData = createEmptyServerConfig();
      setFormData(emptyData);
      setInitialData(emptyData);
      setValidationErrors({});

      // Re-focus on Server ID field for quick consecutive adds
      setTimeout(() => {
        if (serverIdInputRef.current) {
          serverIdInputRef.current.focus();
        }
      }, 100);

      // TODO: Update sidebar list with new server (requires parent state update)
    } catch (error) {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to add server',
        description: error instanceof Error ? error.message : 'Failed to create server',
        duration: Infinity,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Revert to initial data
    setFormData(initialData);

    toast({
      title: 'Changes discarded',
      description: 'Form reset to last saved state',
    });
  };

  // Delete button click handler - opens confirmation dialog
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  // Cancel delete - closes dialog without deleting
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  // Confirm delete - closes dialog and proceeds with deletion
  const handleConfirmDelete = async () => {
    if (!selectedServerId || selectedServerId === '__ADD_MODE__') return;

    setShowDeleteDialog(false);
    setIsLoading(true);

    try {
      await configApi.deleteServer(selectedServerId);

      // Success feedback
      toast({
        title: 'Server deleted successfully',
        description: `${formData.name} has been removed from monitoring`,
        duration: 3000, // Auto-dismiss after 3 seconds (AC #12)
      });

      // TODO: Clear selection and update sidebar (requires parent state update)
      // For now, form will stay until parent clears selection
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete server',
        description: error instanceof Error ? error.message : 'Failed to delete server',
        duration: Infinity, // Persist until manually dismissed (AC #13)
      });
      console.error('Delete failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Unsaved changes dialog handlers
  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);

    toast({
      title: 'Changes discarded',
      description: 'Unsaved changes have been discarded',
      duration: 2000,
    });

    // Allow navigation to proceed (already happened, we just accept it)
    skipUnsavedCheck.current = true;
    setPendingNavigation(null);
  };

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false);

    // Navigate BACK to the previous server (undo the navigation)
    if (pendingNavigation && onNavigationRequest) {
      const [prevId, type] = pendingNavigation.split(':') as [string, 'server' | 'group' | 'add-server'];
      skipUnsavedCheck.current = true; // Don't show dialog again for this navigation
      onNavigationRequest(prevId, type);
    }
    setPendingNavigation(null);
  };

  const handleSaveAndContinue = async () => {
    if (!formData) return;

    setIsLoading(true);

    try {
      // Determine which server ID to use for saving (the PREVIOUS one before navigation)
      const serverIdToSave = pendingNavigation ? pendingNavigation.split(':')[0] : selectedServerId;

      // Save current server
      if (serverIdToSave === '__ADD_MODE__') {
        await configApi.createServer(formData as any);
      } else if (serverIdToSave) {
        await configApi.updateServer(serverIdToSave, formData as any);
      }

      // Success
      toast({
        title: 'Server saved successfully',
        description: `${formData.name} has been saved`,
        duration: 3000,
      });

      setShowUnsavedDialog(false);

      // Allow navigation to proceed (it already happened, we saved and accept it)
      skipUnsavedCheck.current = true;
      setPendingNavigation(null);
    } catch (error) {
      // Save failed - navigate back to previous server
      toast({
        variant: 'destructive',
        title: 'Failed to save server',
        description: error instanceof Error ? error.message : 'Save operation failed',
        duration: Infinity,
      });
      setShowUnsavedDialog(false);

      // Navigate back to previous server since save failed
      if (pendingNavigation && onNavigationRequest) {
        const [prevId, type] = pendingNavigation.split(':') as [string, 'server' | 'group' | 'add-server'];
        skipUnsavedCheck.current = true;
        onNavigationRequest(prevId, type);
      }
      setPendingNavigation(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if any validation errors exist
  const hasErrors = Object.values(validationErrors).some(error => error !== null);

  // Server add/edit form view
  if (isAddMode || (isEditMode && selectedServerName)) {
    const panelTitle = isAddMode ? 'Add New Server' : `Edit Server: ${selectedServerName}`;
    const saveHandler = isAddMode ? handleSaveNewServer : handleSaveExisting;

    return (
      <div className="flex-1 bg-gray-50 flex flex-col">
        <PanelHeader
          title={panelTitle}
          onDelete={isEditMode ? handleDeleteClick : undefined}
          onCancel={handleCancel}
          onSave={saveHandler}
          hasErrors={hasErrors}
          isLoading={isLoading}
          isDirty={isDirty}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <BasicServerInfoSection
            serverId={formData.id || ''}
            serverName={formData.name || ''}
            ip={formData.ip || ''}
            dns={formData.dns || ''}
            onFieldChange={handleFieldChange}
            onValidationChange={handleValidationChange}
            isEditMode={isEditMode}
            serverIdInputRef={serverIdInputRef}
          />

          {/* SNMP Configuration Section */}
          <CollapsibleConfigSection title="SNMP Configuration" defaultOpen={false}>
            <SNMPConfigSection
              snmpConfig={formData.snmp}
              onChange={handleSNMPChange}
            />
          </CollapsibleConfigSection>

          {/* NetApp Configuration Section */}
          <CollapsibleConfigSection title="NetApp Configuration" defaultOpen={false}>
            <NetAppConfigSection
              netappConfig={formData.netapp}
              onChange={handleNetAppChange}
            />
          </CollapsibleConfigSection>
        </div>

        {/* Delete Confirmation Dialog */}
        {isEditMode && formData && (
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Server?</DialogTitle>
                <DialogDescription>
                  Remove {formData.name} from monitoring? This will stop monitoring immediately.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={handleCancelDelete}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Delete Server
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Unsaved Changes Confirmation Dialog */}
        <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. What would you like to do?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={handleDiscardChanges}
              >
                Discard Changes
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancelDialog}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAndContinue}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Group edit form view (Epic 3)
  if (selectedGroupId) {
    return (
      <div className="bg-[#fafafa] flex-1 p-6 flex flex-col">
        <EmptyState message="Group editing coming soon" />
      </div>
    );
  }

  // Empty state when nothing selected
  return (
    <div className="bg-[#fafafa] flex-1 p-6 flex flex-col">
      <EmptyState />
    </div>
  );
}
