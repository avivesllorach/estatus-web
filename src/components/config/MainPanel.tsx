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
}

export function MainPanel({
  selectedServerId,
  selectedGroupId,
  selectedServerName,
  selectedServer
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

  // Ref for auto-focus on Server ID field in add mode
  const serverIdInputRef = useRef<HTMLInputElement>(null);

  // Update form data and initialData when mode or selected server changes
  useEffect(() => {
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
  }, [isAddMode, selectedServer?.id]);

  // Auto-focus Server ID field when entering add mode
  useEffect(() => {
    if (isAddMode && serverIdInputRef.current) {
      serverIdInputRef.current.focus();
    }
  }, [isAddMode]);

  // Compute dirty state (has unsaved changes)
  const isDirty = useMemo(() => {
    if (!initialData || !formData) return false;
    return JSON.stringify(initialData) !== JSON.stringify(formData);
  }, [initialData, formData]);

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
          onDelete={isEditMode ? () => {} : undefined}
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
