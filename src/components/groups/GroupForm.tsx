import { useState, useEffect, useMemo, useCallback } from 'react';
import { PanelHeader } from '@/components/config/PanelHeader';
import { FormSection } from '@/components/config/forms/shared/FormSection';
import { FormGroup } from '@/components/config/forms/shared/FormGroup';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { GroupConfig } from '@/types/group';
import { ServerData } from '@/services/api';
import { Search, Filter, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';

interface GroupFormProps {
  groupId: string | null;
  groupName?: string | null;
  selectedGroup?: GroupConfig | null;
  servers: ServerData[]; // Available servers for assignment
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

// Enhanced Server Item Component
interface ServerItemProps {
  server: ServerData;
  isAssigned: boolean;
  onToggle: (serverId: string, checked: boolean) => void;
  isLoading: boolean;
}

function ServerItem({ server, isAssigned, onToggle, isLoading }: ServerItemProps) {
  return (
    <div className="group flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
      <Checkbox
        id={`server-${server.id}`}
        checked={isAssigned}
        onCheckedChange={(checked) => onToggle(server.id, checked as boolean)}
        disabled={isLoading}
        aria-label={`Select ${server.name} (${server.ip})`}
      />
      <div className="flex-1 min-w-0">
        <Label
          htmlFor={`server-${server.id}`}
          className="text-sm font-medium cursor-pointer truncate block"
        >
          {server.name}
        </Label>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{server.ip}</span>
          <span>•</span>
          <span title={`Last checked: ${server.lastChecked}`}>
            {server.lastChecked ? formatLastChecked(server.lastChecked) : 'Never'}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          server.isOnline
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {server.isOnline ? 'Online' : 'Offline'}
        </span>
        {isAssigned && (
          <CheckSquare className="h-4 w-4 text-blue-600" aria-label="Selected" />
        )}
      </div>
    </div>
  );
}

// Helper function to create empty group config template
function createEmptyGroupConfig(): Partial<GroupConfig> {
  return {
    id: '',
    name: '',
    order: 1,
    serverIds: []
  };
}

// Helper function for formatting timestamps (moved outside component for reuse)
function formatLastChecked(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

export function GroupForm({
  groupId,
  groupName,
  selectedGroup,
  servers,
  onCancel,
  onSave,
  onDelete
}: GroupFormProps) {
  const { toast } = useToast();

  // Determine mode based on groupId
  const isAddMode = groupId === '__ADD_MODE__';
  const isEditMode = groupId !== null && groupId !== '__ADD_MODE__';

  // Form state for group editing/adding
  const [formData, setFormData] = useState<Partial<GroupConfig>>({
    id: selectedGroup?.id || '',
    name: selectedGroup?.name || '',
    order: selectedGroup?.order || 1,
    serverIds: selectedGroup?.serverIds || []
  });

  // Initial data for dirty state tracking
  const [initialData, setInitialData] = useState<Partial<GroupConfig>>({
    id: selectedGroup?.id || '',
    name: selectedGroup?.name || '',
    order: selectedGroup?.order || 1,
    serverIds: selectedGroup?.serverIds || []
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

  // Enhanced server assignment state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [onlineServersOpen, setOnlineServersOpen] = useState(true);
  const [offlineServersOpen, setOfflineServersOpen] = useState(true);

  // Compute dirty state (has unsaved changes)
  const isDirty = useMemo(() => {
    if (!initialData || !formData) return false;
    return JSON.stringify(initialData) !== JSON.stringify(formData);
  }, [initialData, formData]);

  // Enhanced server filtering and grouping
  const filteredAndGroupedServers = useMemo(() => {
    let filtered = servers.filter(server => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.ip.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'online' && server.isOnline) ||
        (statusFilter === 'offline' && !server.isOnline);

      return matchesSearch && matchesStatus;
    });

    // Group by status
    const online = filtered.filter(server => server.isOnline);
    const offline = filtered.filter(server => !server.isOnline);

    return { online, offline, total: filtered };
  }, [servers, searchTerm, statusFilter]);

  // Bulk selection handlers
  const handleSelectAll = useCallback(() => {
    const allFilteredIds = filteredAndGroupedServers.total.map(server => server.id);
    setFormData(prev => ({
      ...prev,
      serverIds: [...new Set([...(prev.serverIds || []), ...allFilteredIds])]
    }));
  }, [filteredAndGroupedServers.total]);

  const handleDeselectAll = useCallback(() => {
    const allFilteredIds = new Set(filteredAndGroupedServers.total.map(server => server.id));
    setFormData(prev => ({
      ...prev,
      serverIds: (prev.serverIds || []).filter(id => !allFilteredIds.has(id))
    }));
  }, [filteredAndGroupedServers.total]);

  // Keyboard shortcuts for bulk operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + A: Select all filtered servers
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && event.shiftKey) {
        event.preventDefault();
        handleSelectAll();
      }
      // Ctrl/Cmd + A: Deselect all filtered servers
      else if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !event.shiftKey) {
        event.preventDefault();
        handleDeselectAll();
      }
      // Escape: Clear search and filters
      else if (event.key === 'Escape') {
        event.preventDefault();
        setSearchTerm('');
        setStatusFilter('all');
      }
      // Ctrl/Cmd + F: Focus search input
      else if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.querySelector('input[aria-label="Search servers"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll, handleDeselectAll]);

  // Load data when group changes
  useEffect(() => {
    if (isAddMode) {
      // Add mode: clear form with empty template
      const emptyData = createEmptyGroupConfig();
      setFormData(emptyData);
      setInitialData(emptyData);
      setValidationErrors({});
    } else if (selectedGroup) {
      // Edit mode: load group data
      const groupData = {
        id: selectedGroup.id,
        name: selectedGroup.name,
        order: selectedGroup.order,
        serverIds: selectedGroup.serverIds
      };
      setFormData(groupData);
      setInitialData(groupData);
    }
  }, [isAddMode, selectedGroup?.id, groupId]);

  const handleFieldChange = (field: keyof GroupConfig, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServerToggle = (serverId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      serverIds: checked
        ? [...(prev.serverIds || []), serverId]
        : (prev.serverIds || []).filter(id => id !== serverId)
    }));
  };

  // Display order increment/decrement handlers
  const handleIncrementOrder = () => {
    const currentValue = formData.order || 1;
    const newValue = Math.min(currentValue + 1, 100); // Maximum 100 as per validation
    handleFieldChange('order', newValue);
  };

  const handleDecrementOrder = () => {
    const currentValue = formData.order || 1;
    const newValue = Math.max(currentValue - 1, 1); // Minimum 1 as per validation
    handleFieldChange('order', newValue);
  };

  // Keyboard navigation for order field
  const handleOrderKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleIncrementOrder();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleDecrementOrder();
    }
  };

  // Validate group data
  const validateGroup = (data: Partial<GroupConfig>): Record<string, string | null> => {
    const errors: Record<string, string | null> = {};

    // Group name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.name = 'Group name is required';
    } else if (data.name.trim().length > 50) {
      errors.name = 'Group name must be 50 characters or less';
    }

    // Order validation
    if (!data.order || data.order < 1 || data.order > 100) {
      errors.order = 'Order must be between 1 and 100';
    }

    // Server IDs validation (all serverIds must exist in servers list)
    if (data.serverIds && data.serverIds.length > 0) {
      const validServerIds = servers.map(s => s.id);
      const invalidIds = data.serverIds.filter(id => !validServerIds.includes(id));
      if (invalidIds.length > 0) {
        errors.serverIds = `Invalid server IDs: ${invalidIds.join(', ')}`;
      }
    }

    return errors;
  };

  // Save handler for editing existing group
  const handleSaveExisting = async () => {
    // Validate form
    const errors = validateGroup(formData);
    setValidationErrors(errors);
    const hasErrors = Object.values(errors).some(error => error !== null);

    if (hasErrors) {
      toast({
        variant: 'destructive',
        title: 'Validation errors',
        description: 'Please fix all validation errors before saving',
        duration: Infinity,
      });
      return;
    }

    if (!selectedGroup?.id || !formData.id) {
      toast({
        variant: 'destructive',
        title: 'No group selected',
        description: 'Please select a group to edit',
        duration: Infinity,
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Call API to save group
      // await configApi.updateGroup(selectedGroup.id, formData as GroupConfig);

      // Update initialData to mark form as clean
      setInitialData(formData);

      // Show success toast
      toast({
        title: 'Group saved',
        description: `${formData.name} configuration updated successfully`,
        duration: 3000,
      });

      // Call parent save handler
      onSave();
    } catch (error) {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save group configuration',
        duration: Infinity,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save handler for adding new group
  const handleSaveNewGroup = async () => {
    // Validate form
    const errors = validateGroup(formData);
    setValidationErrors(errors);
    const hasErrors = Object.values(errors).some(error => error !== null);

    if (hasErrors) {
      toast({
        variant: 'destructive',
        title: 'Validation errors',
        description: 'Please fix all validation errors before saving',
        duration: Infinity,
      });
      return;
    }

    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Please fill in group name',
        duration: Infinity,
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Call API to create group
      // const newGroup = await configApi.createGroup(formData as Omit<GroupConfig, 'id'>);

      // Show success toast
      toast({
        title: 'Group added successfully',
        description: `${formData.name} has been created`,
        duration: 3000,
      });

      // Clear form for another add
      const emptyData = createEmptyGroupConfig();
      setFormData(emptyData);
      setInitialData(emptyData);
      setValidationErrors({});

      // Call parent save handler
      onSave();
    } catch (error) {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to add group',
        description: error instanceof Error ? error.message : 'Failed to create group',
        duration: Infinity,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isAddMode) {
      // Add mode: clear selection and return to empty state
      onCancel();

      toast({
        title: 'Add canceled',
        description: 'New group creation canceled',
      });
    } else {
      // Edit mode: revert to original values
      setFormData(initialData);

      toast({
        title: 'Changes discarded',
        description: 'Form reset to last saved state',
      });
    }
  };

  const panelTitle = isAddMode ? 'Add New Group' : `Edit Group: ${selectedGroup?.name || groupName}`;
  const saveHandler = isAddMode ? handleSaveNewGroup : handleSaveExisting;
  const hasErrors = Object.values(validationErrors).some(error => error !== null);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col">
      <PanelHeader
        title={panelTitle}
        onDelete={isEditMode ? onDelete : undefined}
        onCancel={handleCancel}
        onSave={saveHandler}
        hasErrors={hasErrors}
        isLoading={isLoading}
        isDirty={isDirty}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Basic Group Information */}
        <FormSection title="Group Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup
              label="Group Name"
              required
              error={validationErrors.name}
              htmlFor="group-name"
            >
              <Input
                id="group-name"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., ARAGÓ"
                disabled={isLoading}
              />
            </FormGroup>

            <FormGroup
              label="Display Order"
              error={validationErrors.order}
              htmlFor="group-order"
              helperText="Groups are displayed on the dashboard in ascending order"
            >
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    id="group-order"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.order || 1}
                    onChange={(e) => handleFieldChange('order', parseInt(e.target.value) || 1)}
                    onKeyDown={handleOrderKeyDown}
                    disabled={isLoading}
                    aria-label="Display order value"
                    className="pr-20"
                  />
                  <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                      onClick={handleDecrementOrder}
                      disabled={isLoading || (formData.order || 1) <= 1}
                      aria-label="Decrease display order"
                      tabIndex={-1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                      onClick={handleIncrementOrder}
                      disabled={isLoading || (formData.order || 1) >= 100}
                      aria-label="Increase display order"
                      tabIndex={-1}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </FormGroup>
          </div>
        </FormSection>

        {/* Enhanced Server Assignment */}
        <FormSection title="Server Assignment">
          <FormGroup
            label="Assigned Servers"
            helperText="Select the servers that should be included in this group"
            error={validationErrors.serverIds}
          >
            {servers.length === 0 ? (
              <div className="p-6 text-center border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500 italic">
                  No servers available. Add servers first to assign them to groups.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or IP address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      aria-label="Search servers"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 hidden sm:block">
                      Ctrl+F
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('all')}
                      className="whitespace-nowrap"
                      aria-label="Show all servers"
                    >
                      All ({servers.length})
                    </Button>
                    <Button
                      variant={statusFilter === 'online' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('online')}
                      className="whitespace-nowrap"
                      aria-label="Show online servers only"
                    >
                      Online ({servers.filter(s => s.isOnline).length})
                    </Button>
                    <Button
                      variant={statusFilter === 'offline' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('offline')}
                      className="whitespace-nowrap"
                      aria-label="Show offline servers only"
                    >
                      Offline ({servers.filter(s => !s.isOnline).length})
                    </Button>
                  </div>
                </div>

                {/* Keyboard Shortcuts Help */}
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                  <span className="font-medium">Shortcuts:</span>
                  <span className="ml-2">Ctrl+F: Search</span>
                  <span className="ml-3">Ctrl+Shift+A: Select All</span>
                  <span className="ml-3">Ctrl+A: Deselect All</span>
                  <span className="ml-3">Esc: Clear Filters</span>
                </div>

                {/* Bulk Selection Controls */}
                {filteredAndGroupedServers.total.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{filteredAndGroupedServers.total.length}</span>
                      <span className="ml-1">servers found</span>
                      {formData.serverIds && formData.serverIds.length > 0 && (
                        <span className="ml-2">
                          • <span className="font-medium ml-1">{formData.serverIds.length}</span>
                          <span className="ml-1">assigned</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                        aria-label="Select all filtered servers"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                        aria-label="Deselect all filtered servers"
                      >
                        <Square className="h-4 w-4" />
                        Deselect All
                      </Button>
                    </div>
                  </div>
                )}

                {/* Server List */}
                <ScrollArea className="max-h-80 w-full border border-gray-200 rounded-lg">
                  <div className="p-3 space-y-4">
                    {filteredAndGroupedServers.total.length === 0 ? (
                      <div className="text-center py-8">
                        <Filter className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No servers match your search criteria
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="mt-2"
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Online Servers */}
                        {filteredAndGroupedServers.online.length > 0 && (
                          <Collapsible
                            open={onlineServersOpen}
                            onOpenChange={setOnlineServersOpen}
                          >
                            <CollapsibleTrigger asChild>
                              <button className="w-full flex items-center justify-between p-2 bg-green-50 hover:bg-green-100 rounded-md transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-green-800">
                                    Online Servers ({filteredAndGroupedServers.online.length})
                                  </span>
                                </div>
                                {onlineServersOpen ? (
                                  <ChevronUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-green-600" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 space-y-1">
                                {filteredAndGroupedServers.online.map((server) => (
                                  <ServerItem
                                    key={server.id}
                                    server={server}
                                    isAssigned={formData.serverIds?.includes(server.id) || false}
                                    onToggle={handleServerToggle}
                                    isLoading={isLoading}
                                  />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Offline Servers */}
                        {filteredAndGroupedServers.offline.length > 0 && (
                          <Collapsible
                            open={offlineServersOpen}
                            onOpenChange={setOfflineServersOpen}
                          >
                            <CollapsibleTrigger asChild>
                              <button className="w-full flex items-center justify-between p-2 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-red-800">
                                    Offline Servers ({filteredAndGroupedServers.offline.length})
                                  </span>
                                </div>
                                {offlineServersOpen ? (
                                  <ChevronUp className="h-4 w-4 text-red-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-red-600" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 space-y-1">
                                {filteredAndGroupedServers.offline.map((server) => (
                                  <ServerItem
                                    key={server.id}
                                    server={server}
                                    isAssigned={formData.serverIds?.includes(server.id) || false}
                                    onToggle={handleServerToggle}
                                    isLoading={isLoading}
                                  />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* Server Count Summary */}
                {formData.serverIds && formData.serverIds.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{formData.serverIds.length}</strong>
                      <span className="ml-1">
                        server{formData.serverIds.length !== 1 ? 's' : ''} assigned to this group
                      </span>
                      {filteredAndGroupedServers.total.length !== servers.length && (
                        <span className="ml-2 text-blue-600">
                          ({filteredAndGroupedServers.total.length} of {servers.length} visible)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </FormGroup>
        </FormSection>
      </div>
    </div>
  );
}