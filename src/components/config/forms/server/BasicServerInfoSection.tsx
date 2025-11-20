import { useState } from 'react';
import { FormSection } from '../shared/FormSection';
import { FormRow } from '../shared/FormRow';
import { FormGroup } from '../shared/FormGroup';
import { Input } from '@/components/ui/input';
import {
  validateServerName,
  validateIPv4,
  validateDNS
} from '@/utils/validation';

interface BasicServerInfoSectionProps {
  serverId: string;
  serverName: string;
  ip: string;
  dns: string;
  onFieldChange: (field: string, value: string) => void;
  onValidationChange?: (errors: Record<string, string | null>) => void;
  isEditMode?: boolean;
  serverIdInputRef?: React.RefObject<HTMLInputElement>;
}

export function BasicServerInfoSection({
  serverId,
  serverName,
  ip,
  dns,
  onFieldChange,
  onValidationChange,
  isEditMode = true,
  serverIdInputRef
}: BasicServerInfoSectionProps) {
  // Validation error state
  const [errors, setErrors] = useState<Record<string, string | null>>({
    name: null,
    ip: null,
    dns: null
  });

  // Update parent with validation state
  const updateErrors = (field: string, error: string | null) => {
    const newErrors = { ...errors, [field]: error };
    setErrors(newErrors);
    onValidationChange?.(newErrors);
  };

  // Validation handlers (on blur)
  const handleNameBlur = () => {
    const error = validateServerName(serverName);
    updateErrors('name', error);
  };

  const handleIPBlur = () => {
    const error = validateIPv4(ip);
    updateErrors('ip', error);
  };

  const handleDNSBlur = () => {
    const error = validateDNS(dns || '');
    updateErrors('dns', error);
  };

  return (
    <FormSection title="Basic Information">
      <FormRow>
        <FormGroup
          label="Server ID"
          required
          helperText="Unique identifier"
          htmlFor="server-id"
        >
          <Input
            id="server-id"
            ref={serverIdInputRef}
            value={serverId}
            onChange={(e) => onFieldChange('id', e.target.value)}
            disabled={isEditMode}
            className={isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}
            placeholder="e.g., aragó-01"
          />
        </FormGroup>

        <FormGroup
          label="Server Name"
          required
          htmlFor="server-name"
          error={errors.name}
        >
          <Input
            id="server-name"
            value={serverName}
            onChange={(e) => onFieldChange('name', e.target.value)}
            onBlur={handleNameBlur}
            placeholder="e.g., ARAGÓ-01"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup
          label="IP Address"
          required
          helperText="Expected format: xxx.xxx.xxx.xxx"
          htmlFor="ip-address"
          error={errors.ip}
        >
          <Input
            id="ip-address"
            value={ip}
            onChange={(e) => onFieldChange('ip', e.target.value)}
            onBlur={handleIPBlur}
            placeholder="192.168.1.1"
            className="font-mono"
          />
        </FormGroup>

        <FormGroup
          label="DNS Address"
          required
          htmlFor="dns-address"
          error={errors.dns}
        >
          <Input
            id="dns-address"
            value={dns}
            onChange={(e) => onFieldChange('dns', e.target.value)}
            onBlur={handleDNSBlur}
            placeholder="server.local"
          />
        </FormGroup>
      </FormRow>
    </FormSection>
  );
}
