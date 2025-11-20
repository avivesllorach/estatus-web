import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormGroup } from "../shared/FormGroup";
import { X, Plus } from "lucide-react";
import { NetAppConfig, LunConfig } from "@/types/server";

interface NetAppConfigSectionProps {
  netappConfig?: NetAppConfig;
  onChange: (config: NetAppConfig) => void;
}

export function NetAppConfigSection({
  netappConfig,
  onChange,
}: NetAppConfigSectionProps) {
  // State
  const [enabled, setEnabled] = useState(netappConfig?.enabled || false);
  const [apiType, setApiType] = useState<"rest" | "zapi">(
    netappConfig?.apiType || "rest"
  );
  const [username, setUsername] = useState(netappConfig?.username || "");
  const [password, setPassword] = useState(netappConfig?.password || "");
  const [luns, setLuns] = useState<LunConfig[]>(netappConfig?.luns || []);

  // Update parent when state changes
  const updateConfig = (
    updates: Partial<{
      enabled: boolean;
      apiType: "rest" | "zapi";
      username: string;
      password: string;
      luns: LunConfig[];
    }>
  ) => {
    const newConfig: NetAppConfig = {
      enabled: updates.enabled !== undefined ? updates.enabled : enabled,
      apiType: updates.apiType !== undefined ? updates.apiType : apiType,
      username: updates.username !== undefined ? updates.username : username,
      password: updates.password !== undefined ? updates.password : password,
      luns: updates.luns !== undefined ? updates.luns : luns,
    };
    onChange(newConfig);
  };

  // Handlers
  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    updateConfig({ enabled: checked });
  };

  const handleApiTypeChange = (value: "rest" | "zapi") => {
    setApiType(value);
    updateConfig({ apiType: value });
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    updateConfig({ username: value });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    updateConfig({ password: value });
  };

  const handleLUNChange = (index: number, field: "name" | "path", value: string) => {
    const newLuns = [...luns];
    newLuns[index] = { ...newLuns[index], [field]: value };
    setLuns(newLuns);
    updateConfig({ luns: newLuns });
  };

  const addLUN = () => {
    const newLuns = [...luns, { name: "", path: "" }];
    setLuns(newLuns);
    updateConfig({ luns: newLuns });
  };

  const removeLUN = (index: number) => {
    const newLuns = luns.filter((_, i) => i !== index);
    setLuns(newLuns);
    updateConfig({ luns: newLuns });
  };

  return (
    <div className="space-y-6">
      {/* Enable NetApp Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="netapp-enabled"
          checked={enabled}
          onCheckedChange={handleEnabledChange}
        />
        <label
          htmlFor="netapp-enabled"
          className="text-sm font-semibold text-gray-900 cursor-pointer"
        >
          Enable NetApp monitoring
        </label>
      </div>

      {/* API Type Select */}
      <FormGroup label="API Type" htmlFor="api-type">
        <Select
          value={apiType}
          onValueChange={handleApiTypeChange}
          disabled={!enabled}
        >
          <SelectTrigger
            id="api-type"
            className={!enabled ? "bg-gray-100 cursor-not-allowed" : ""}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rest">REST</SelectItem>
            <SelectItem value="zapi">ZAPI</SelectItem>
          </SelectContent>
        </Select>
      </FormGroup>

      {/* Username Input */}
      <FormGroup label="Username" htmlFor="username">
        <Input
          id="username"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          disabled={!enabled}
          className={!enabled ? "bg-gray-100 cursor-not-allowed" : ""}
          placeholder="admin"
        />
      </FormGroup>

      {/* Password Input */}
      <FormGroup label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          disabled={!enabled}
          className={!enabled ? "bg-gray-100 cursor-not-allowed" : ""}
          placeholder="••••••••"
        />
      </FormGroup>

      {/* LUN Paths Dynamic List */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">
          LUN Paths
        </label>

        {luns.map((lun, index) => (
          <div key={index} className="flex items-end gap-4">
            <div className="flex-1">
              <FormGroup label="Name" htmlFor={`lun-name-${index}`}>
                <Input
                  id={`lun-name-${index}`}
                  value={lun.name}
                  onChange={(e) => handleLUNChange(index, "name", e.target.value)}
                  disabled={!enabled}
                  className={!enabled ? "bg-gray-100 cursor-not-allowed" : ""}
                  placeholder="DEV1"
                />
              </FormGroup>
            </div>
            <div className="flex-1">
              <FormGroup label="Path" htmlFor={`lun-path-${index}`}>
                <Input
                  id={`lun-path-${index}`}
                  value={lun.path}
                  onChange={(e) => handleLUNChange(index, "path", e.target.value)}
                  disabled={!enabled}
                  className={!enabled ? "bg-gray-100 cursor-not-allowed" : ""}
                  placeholder="/vol/data/lun0"
                />
              </FormGroup>
            </div>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => removeLUN(index)}
              className="mb-2"
              aria-label={`Remove LUN ${lun.name || lun.path || index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="secondary"
          onClick={addLUN}
          disabled={!enabled}
          className={!enabled ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add LUN
        </Button>
      </div>
    </div>
  );
}
