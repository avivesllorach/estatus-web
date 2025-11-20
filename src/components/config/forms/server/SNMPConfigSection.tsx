import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormGroup } from "../shared/FormGroup";
import { FormRow } from "../shared/FormRow";
import { X, Plus } from "lucide-react";
import { SnmpConfig, DiskConfig } from "@/types/server";

interface SNMPConfigSectionProps {
  snmpConfig?: SnmpConfig;
  onChange: (config: SnmpConfig) => void;
}

export function SNMPConfigSection({ snmpConfig, onChange }: SNMPConfigSectionProps) {
  // State
  const [enabled, setEnabled] = useState(snmpConfig?.enabled || false);
  const [storageIndexes, setStorageIndexes] = useState(
    snmpConfig?.storageIndexes ? snmpConfig.storageIndexes.join(',') : ''
  );
  const [diskMappings, setDiskMappings] = useState<DiskConfig[]>(
    snmpConfig?.disks || []
  );

  // Update parent when state changes
  const updateConfig = (updates: Partial<{
    enabled: boolean;
    storageIndexes: string;
    diskMappings: DiskConfig[];
  }>) => {
    const storageIndexesValue = updates.storageIndexes !== undefined
      ? updates.storageIndexes
      : storageIndexes;

    const newConfig: SnmpConfig = {
      enabled: updates.enabled !== undefined ? updates.enabled : enabled,
      storageIndexes: storageIndexesValue
        .split(',')
        .map(s => s.trim())
        .filter(s => s)
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n)),
      disks: updates.diskMappings !== undefined ? updates.diskMappings : diskMappings,
    };
    onChange(newConfig);
  };

  // Handlers
  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    updateConfig({ enabled: checked });
  };

  const handleStorageIndexesChange = (value: string) => {
    setStorageIndexes(value);
    updateConfig({ storageIndexes: value });
  };

  const handleDiskMappingChange = (index: number, field: 'index' | 'name', value: string | number) => {
    const newMappings = [...diskMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setDiskMappings(newMappings);
    updateConfig({ diskMappings: newMappings });
  };

  const addDiskMapping = () => {
    const newMappings = [...diskMappings, { index: 0, name: '' }];
    setDiskMappings(newMappings);
    updateConfig({ diskMappings: newMappings });
  };

  const removeDiskMapping = (index: number) => {
    const newMappings = diskMappings.filter((_, i) => i !== index);
    setDiskMappings(newMappings);
    updateConfig({ diskMappings: newMappings });
  };

  return (
    <div className="space-y-6">
      {/* Enable SNMP Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="snmp-enabled"
          checked={enabled}
          onCheckedChange={handleEnabledChange}
        />
        <label
          htmlFor="snmp-enabled"
          className="text-sm font-semibold text-gray-900 cursor-pointer"
        >
          Enable SNMP monitoring
        </label>
      </div>

      {/* Storage Indexes Input */}
      <FormGroup
        label="Storage Indexes"
        htmlFor="storage-indexes"
        helperText="Comma-separated list (e.g., 2,3,4)"
      >
        <Input
          id="storage-indexes"
          value={storageIndexes}
          onChange={(e) => handleStorageIndexesChange(e.target.value)}
          disabled={!enabled}
          className={!enabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          placeholder="2,3,4"
        />
      </FormGroup>

      {/* Disk Mappings Dynamic List */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">
          Disk Mappings
        </label>

        {diskMappings.map((mapping, index) => (
          <div key={index} className="flex items-end gap-4">
            <div className="flex-1">
              <FormRow>
                <FormGroup label="Index" htmlFor={`disk-index-${index}`}>
                  <Input
                    id={`disk-index-${index}`}
                    type="number"
                    value={mapping.index}
                    onChange={(e) => handleDiskMappingChange(index, 'index', Number(e.target.value))}
                    disabled={!enabled}
                    className={!enabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                  />
                </FormGroup>
                <FormGroup label="Custom Name" htmlFor={`disk-name-${index}`}>
                  <Input
                    id={`disk-name-${index}`}
                    value={mapping.name || ''}
                    onChange={(e) => handleDiskMappingChange(index, 'name', e.target.value)}
                    disabled={!enabled}
                    className={!enabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                    placeholder="C:\\"
                  />
                </FormGroup>
              </FormRow>
            </div>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => removeDiskMapping(index)}
              className="mb-2"
              aria-label={`Remove disk mapping ${mapping.name || index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="secondary"
          onClick={addDiskMapping}
          disabled={!enabled}
          className={!enabled ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Disk
        </Button>
      </div>
    </div>
  );
}
