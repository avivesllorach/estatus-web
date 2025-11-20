import { ReactNode, useState } from 'react';
import { EmptyState } from './EmptyState';
import { PanelHeader } from './PanelHeader';
import { BasicServerInfoSection } from './forms/server/BasicServerInfoSection';
import { SNMPConfigSection } from './forms/server/SNMPConfigSection';
import { CollapsibleConfigSection } from './forms/shared/CollapsibleConfigSection';
import { ServerConfig, SnmpConfig } from '@/types/server';

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

  // Form state for server editing
  const [formData, setFormData] = useState<Partial<ServerConfig>>({
    id: selectedServer?.id || '',
    name: selectedServer?.name || '',
    ip: selectedServer?.ip || '',
    dns: selectedServer?.dns || '',
    snmp: selectedServer?.snmp
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

  // Update form data when server changes
  if (selectedServer && formData.id !== selectedServer.id) {
    setFormData({
      id: selectedServer.id,
      name: selectedServer.name,
      ip: selectedServer.ip,
      dns: selectedServer.dns,
      snmp: selectedServer.snmp
    });
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleValidationChange = (errors: Record<string, string | null>) => {
    setValidationErrors(errors);
  };

  const handleSNMPChange = (snmpConfig: SnmpConfig) => {
    setFormData(prev => ({ ...prev, snmp: snmpConfig }));
  };

  // Check if any validation errors exist
  const hasErrors = Object.values(validationErrors).some(error => error !== null);

  // Server edit form view
  if (selectedServerId && selectedServerName) {
    return (
      <div className="flex-1 bg-gray-50 flex flex-col">
        <PanelHeader
          title={`Edit Server: ${selectedServerName}`}
          onDelete={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
          hasErrors={hasErrors}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <BasicServerInfoSection
            serverId={formData.id || ''}
            serverName={formData.name || ''}
            ip={formData.ip || ''}
            dns={formData.dns || ''}
            onFieldChange={handleFieldChange}
            onValidationChange={handleValidationChange}
            isEditMode={true}
          />

          {/* SNMP Configuration Section */}
          <CollapsibleConfigSection title="SNMP Configuration" defaultOpen={false}>
            <SNMPConfigSection
              snmpConfig={formData.snmp}
              onChange={handleSNMPChange}
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
