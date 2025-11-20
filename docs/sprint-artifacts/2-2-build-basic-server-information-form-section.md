# Story 2.2: Build Basic Server Information Form Section

Status: ready-for-dev

## Story

As a user,
I want to see and edit basic server information,
so that I can update server details like name, IP, and DNS address.

## Acceptance Criteria

1. **Given** I have selected a server in the config page
   **When** the edit form loads
   **Then** I see a "Basic Information" form section (white card) with the following fields:

   **First row (two columns):**
   - Server ID (disabled input, gray background, not editable)
   - Server Name (editable input)

   **Second row (two columns):**
   - IP Address (editable input, monospace font)
   - DNS Address (editable input)

2. **And** all inputs use shadcn/ui Input component with:
   - 6px border radius
   - Gray border (#d4d4d4)
   - Blue focus ring (2px, #2563eb)
   - 14px font size
   - Labels above inputs (14px, semibold)

3. **And** required fields show asterisk (*) in label

4. **And** current server values are pre-populated in the form

## Tasks / Subtasks

- [ ] Task 1: Create FormSection component (AC: 1)
  - [ ] Create new file `src/components/config/forms/shared/FormSection.tsx`
  - [ ] Define TypeScript interface: `FormSectionProps { title: string, children: ReactNode }`
  - [ ] Implement white card container with title header
  - [ ] Style: white background, rounded corners (rounded-lg), shadow (shadow-sm), padding (p-6)
  - [ ] Title: 18px (text-lg), semibold, gray-900, bottom margin (mb-4)

- [ ] Task 2: Create FormRow component for two-column grid layout (AC: 1)
  - [ ] Create new file `src/components/config/forms/shared/FormRow.tsx`
  - [ ] Define interface: `FormRowProps { children: ReactNode }`
  - [ ] Implement CSS Grid with 2 columns: `className="grid grid-cols-2 gap-4"`
  - [ ] Responsive: single column on small screens (optional for MVP)

- [ ] Task 3: Create FormGroup component for label + input wrapper (AC: 2, 3)
  - [ ] Create new file `src/components/config/forms/shared/FormGroup.tsx`
  - [ ] Define interface: `FormGroupProps { label: string, required?: boolean, children: ReactNode, error?: string, helperText?: string }`
  - [ ] Render Label component from shadcn/ui with asterisk if required
  - [ ] Render children (input element) below label
  - [ ] Add optional error message display (red text, 12px) - prepared for Story 2.3
  - [ ] Add optional helper text display (gray-600, 12px)
  - [ ] Style: flex flex-col gap-2 (8px spacing)

- [ ] Task 4: Create BasicServerInfoSection component (AC: 1, 4)
  - [ ] Create new file `src/components/config/forms/BasicServerInfoSection.tsx`
  - [ ] Define interface: `BasicServerInfoSectionProps { server: ServerConfig, onChange: (field: string, value: string) => void }`
  - [ ] Use FormSection wrapper with title "Basic Information"
  - [ ] First FormRow: Server ID (disabled) + Server Name (editable)
  - [ ] Second FormRow: IP Address (monospace) + DNS Address (editable)
  - [ ] Server ID input: `disabled` attribute, bg-gray-100, cursor-not-allowed
  - [ ] IP Address input: `className="font-mono"` for monospace font
  - [ ] All inputs pre-populated with server values from props
  - [ ] onChange handler calls props.onChange with field name and new value

- [ ] Task 5: Integrate BasicServerInfoSection into MainPanel (AC: 1, 4)
  - [ ] Modify `src/components/config/MainPanel.tsx`
  - [ ] Import BasicServerInfoSection component
  - [ ] Add state management for form values (useState with server data)
  - [ ] Replace placeholder text with `<BasicServerInfoSection server={selectedServer} onChange={handleFieldChange} />`
  - [ ] Implement handleFieldChange to update form state
  - [ ] Pass selected server data as props

- [ ] Task 6: Test form rendering and data flow (AC: All)
  - [ ] Navigate to `/config` and select a server
  - [ ] Verify "Basic Information" section appears in white card
  - [ ] Verify four fields visible in 2x2 grid layout
  - [ ] Verify Server ID field is disabled (gray background, not editable)
  - [ ] Verify Server Name, IP Address, DNS Address are editable
  - [ ] Verify IP Address uses monospace font
  - [ ] Verify all fields pre-populated with current server values
  - [ ] Verify labels show asterisks for required fields (Server ID, Name, IP, DNS)
  - [ ] Verify label styling: 14px, semibold
  - [ ] Verify input styling: gray border, blue focus ring, 14px font
  - [ ] Test typing in editable fields → verify onChange updates state
  - [ ] Build project (npm run build) → verify no TypeScript errors

## Dev Notes

### Component Specifications

**FormSection Component:**

```typescript
interface FormSectionProps {
  title: string
  children: React.ReactNode
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}
```

**FormRow Component:**

```typescript
interface FormRowProps {
  children: React.ReactNode
}

export function FormRow({ children }: FormRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {children}
    </div>
  )
}
```

**FormGroup Component:**

```typescript
import { Label } from "@/components/ui/label"

interface FormGroupProps {
  label: string
  required?: boolean
  children: React.ReactNode
  error?: string
  helperText?: string
}

export function FormGroup({
  label,
  required = false,
  children,
  error,
  helperText
}: FormGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold text-gray-900">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-gray-600">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
```

**BasicServerInfoSection Component:**

```typescript
import { Input } from "@/components/ui/input"
import { FormSection } from "./shared/FormSection"
import { FormRow } from "./shared/FormRow"
import { FormGroup } from "./shared/FormGroup"
import { ServerConfig } from "@/types/server"

interface BasicServerInfoSectionProps {
  server: ServerConfig
  onChange: (field: string, value: string) => void
}

export function BasicServerInfoSection({
  server,
  onChange
}: BasicServerInfoSectionProps) {
  return (
    <FormSection title="Basic Information">
      <FormRow>
        <FormGroup label="Server ID" required>
          <Input
            value={server.id}
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
        </FormGroup>
        <FormGroup label="Server Name" required>
          <Input
            value={server.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </FormGroup>
      </FormRow>
      <FormRow>
        <FormGroup label="IP Address" required>
          <Input
            value={server.ip}
            onChange={(e) => onChange('ip', e.target.value)}
            className="font-mono"
          />
        </FormGroup>
        <FormGroup label="DNS Address" required>
          <Input
            value={server.dns || ''}
            onChange={(e) => onChange('dns', e.target.value)}
          />
        </FormGroup>
      </FormRow>
    </FormSection>
  )
}
```

**Visual Specifications (from UX Design):**

- **FormSection Card:**
  - Background: White (#ffffff)
  - Border radius: 8px (rounded-lg)
  - Shadow: subtle gray shadow (shadow-sm)
  - Padding: 24px (p-6)
  - Bottom margin: 16px (mb-4) for spacing between sections

- **Section Title:**
  - Font size: 18px (text-lg)
  - Font weight: semibold
  - Color: gray-900
  - Bottom margin: 16px (mb-4)

- **FormRow Grid:**
  - Two columns: equal width
  - Gap: 16px (gap-4)
  - Bottom margin: 16px (mb-4) between rows

- **Labels:**
  - Font size: 14px (text-sm)
  - Font weight: semibold
  - Color: gray-900
  - Required asterisk: red-600 color, 1px left margin

- **Inputs (shadcn/ui Input):**
  - Font size: 14px (text-sm)
  - Border: gray-300 (#d4d4d4)
  - Border radius: 6px (rounded-md)
  - Focus ring: 2px blue (#2563eb, ring-2 ring-blue-600)
  - Disabled: gray-100 background, cursor-not-allowed
  - Monospace (IP Address): font-mono class

**Reference:** UX Design Specification sections 6.1 (FormSection, FormRow, FormGroup) and 5.1 (Edit Server Journey, Step 2)

### State Management Pattern

**MainPanel Form State:**

```typescript
interface MainPanelProps {
  selectedServerId: string | null
  selectedServerName: string | null
  selectedGroupId: string | null
}

export function MainPanel({ selectedServerId, selectedServerName, selectedGroupId }: MainPanelProps) {
  // Fetch full server data
  const selectedServer = servers.find(s => s.id === selectedServerId)

  // Form state - initialized with server values
  const [formValues, setFormValues] = useState<ServerConfig>(() => selectedServer || {})

  // Update form state on server selection change
  useEffect(() => {
    if (selectedServer) {
      setFormValues(selectedServer)
    }
  }, [selectedServer])

  // Handle field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Render form
  if (selectedServerId && selectedServer) {
    return (
      <div className="flex-1 bg-gray-50 flex flex-col">
        <PanelHeader
          title={`Edit Server: ${selectedServerName}`}
          onDelete={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <BasicServerInfoSection
            server={formValues}
            onChange={handleFieldChange}
          />
        </div>
      </div>
    )
  }

  return <EmptyState />
}
```

**Key Patterns:**
- Form state managed in MainPanel (parent component)
- Child components receive data via props, emit changes via onChange callback
- useEffect synchronizes form state when server selection changes
- Uncontrolled → Controlled input pattern (value + onChange)

**Reference:** Architecture doc section 9 (Implementation Patterns)

### Learnings from Previous Story

**From Story 2.1 (Create Server Edit Form Layout with Panel Header - Status: done):**

**Component Structure Established:**
- PanelHeader component created with sticky positioning (z-10)
- MainPanel renders PanelHeader + scrollable content area (bg-gray-50, p-6)
- Conditional rendering based on selectedServerId/selectedGroupId
- No-op handlers for Delete/Cancel/Save (functionality in later stories)

**Files Modified in Story 2.1:**
- Created: `src/components/config/PanelHeader.tsx`
- Modified: `src/components/config/MainPanel.tsx` (added PanelHeader integration)
- Modified: `src/pages/ConfigPage.tsx` (passes selectedServerName)

**Technical Patterns Established:**
- shadcn/ui Button component with variants (destructive, secondary, default)
- TypeScript interfaces for component props
- Additive changes (EmptyState still works when nothing selected)
- Tailwind utility classes for layout/spacing
- Component composition (PanelHeader used within MainPanel)

**Ready Integration Points for Story 2.2:**
- Scrollable content area exists: `<div className="flex-1 overflow-y-auto p-6">`
- Placeholder text ready to be replaced with BasicServerInfoSection
- selectedServer data available in MainPanel (via props/derived state)
- Build passed with 0 TypeScript errors

**Apply to Story 2.2:**
- Create reusable form components (FormSection, FormRow, FormGroup) following established patterns
- Use shadcn/ui Input component (matches Button usage pattern)
- TypeScript interfaces for all component props
- Integrate into MainPanel's scrollable content area
- Maintain additive changes (don't break PanelHeader)

[Source: stories/2-1-create-server-edit-form-layout-with-panel-header.md#Completion-Notes-List]

### Architecture Alignment

**From Architecture Document (section 4 - Component Architecture):**

**Epic 2 Component Hierarchy:**
```
ConfigPage
└── ConfigLayout
    ├── Sidebar (Epic 1 - complete)
    └── MainPanel (Story 2.1 - complete)
        ├── PanelHeader (Story 2.1)
        └── ScrollArea (form content - Story 2.2+)
            └── ServerForm (Stories 2.2-2.5)
                ├── FormSection[] (white cards) ← Story 2.2
                │   ├── FormRow (2-column grid) ← Story 2.2
                │   │   └── FormGroup (label + input + error) ← Story 2.2
                │   └── CollapsibleConfigSection (SNMP/NetApp - Stories 2.4-2.5)
                └── ValidationMessage[] (Story 2.3)
```

**Story 2.2 Specific:**
- Creates FormSection component (white card wrapper)
- Creates FormRow component (2-column CSS Grid)
- Creates FormGroup component (label + input + validation wrapper)
- Creates BasicServerInfoSection (first concrete form section)
- Integrates into MainPanel's scrollable content area

**From Tech Spec (tech-spec-epic-2.md section 2.3 - Component Breakdown):**

**Basic Information Section Fields:**
1. Server ID (disabled, non-editable, gray background)
2. Server Name (required, text input)
3. IP Address (required, text input with monospace font)
4. DNS Address (required, text input)

**Layout:** 2x2 grid (two rows, two columns)

**From UX Design Specification (section 5.1 - Edit Server Journey, Step 2):**

**User Experience Flow:**
- User clicks server name in sidebar (Story 1.4 - done)
- System loads server details into form (<100ms)
- Right panel shows:
  - Fixed header with title + buttons (Story 2.1 - done)
  - **Scrollable form sections below (Story 2.2)** ← THIS STORY

**Form Section Visual Design:**
- White card with subtle shadow
- Section title at top (18px, semibold)
- Fields arranged in 2-column grid
- Labels above inputs with asterisks for required
- Inputs use blue focus ring for visibility

**From PRD (section FR6, FR11):**
- **FR6:** User can edit any field of an existing server configuration
- **FR11:** User can view server configuration details in right panel when selected from list

**Story 2.2 Coverage:**
- Full coverage of FR11 (view server details - Basic Information section)
- Partial coverage of FR6 (edit fields - edit capability added, save functionality in Story 2.6)
- Establishes form editing foundation for Epic 2

**Reference:** PRD FR6, FR11; UX Design section 5.1 (Edit Server Journey, Step 2); Architecture section 4 (Component Architecture)

### Testing Strategy

**Manual Testing Checklist:**

**1. Component Creation:**
- [ ] Verify `src/components/config/forms/shared/FormSection.tsx` created
- [ ] Verify `src/components/config/forms/shared/FormRow.tsx` created
- [ ] Verify `src/components/config/forms/shared/FormGroup.tsx` created
- [ ] Verify `src/components/config/forms/BasicServerInfoSection.tsx` created
- [ ] Verify all TypeScript interfaces defined correctly
- [ ] Verify all components export correctly

**2. Visual Design Verification:**
- [ ] Navigate to `http://localhost:5173/config`
- [ ] Select any server from sidebar
- [ ] Verify "Basic Information" section appears as white card
- [ ] Verify section title: "Basic Information" (18px, semibold, gray-900)
- [ ] Verify white background with subtle shadow (shadow-sm)
- [ ] Verify rounded corners (8px border radius)
- [ ] Verify padding: 24px (all sides)

**3. Form Layout Verification:**
- [ ] Verify 2x2 grid layout (two rows, two columns)
- [ ] Verify 16px gap between columns
- [ ] Verify 16px gap between rows
- [ ] First row: Server ID (left) + Server Name (right)
- [ ] Second row: IP Address (left) + DNS Address (right)

**4. Field Styling Verification:**
- [ ] Verify all labels:
  - [ ] Font size: 14px (text-sm)
  - [ ] Font weight: semibold
  - [ ] Color: gray-900 (dark gray)
  - [ ] Red asterisk (*) for required fields
  - [ ] Asterisk has 1px left margin (ml-1)
- [ ] Verify all inputs:
  - [ ] Font size: 14px (text-sm)
  - [ ] Border: gray (#d4d4d4, border-gray-300)
  - [ ] Border radius: 6px (rounded-md)
  - [ ] Blue focus ring on focus (2px, #2563eb)

**5. Server ID Field (Disabled State):**
- [ ] Verify Server ID field shows current server ID
- [ ] Verify field is disabled (not editable)
- [ ] Verify gray background (bg-gray-100)
- [ ] Verify cursor changes to not-allowed on hover
- [ ] Verify cannot type or modify value

**6. Editable Fields:**
- [ ] Verify Server Name field is editable
- [ ] Verify IP Address field is editable
- [ ] Verify DNS Address field is editable
- [ ] Verify IP Address uses monospace font (font-mono class)
- [ ] Type in each field → verify onChange updates state
- [ ] Verify cursor is text cursor (I-beam) on hover

**7. Data Pre-Population:**
- [ ] Select different servers from sidebar
- [ ] Verify Server ID field updates with new server ID
- [ ] Verify Server Name field updates with new server name
- [ ] Verify IP Address field updates with new server IP
- [ ] Verify DNS Address field updates with new server DNS
- [ ] Verify all fields show current server values immediately

**8. State Management:**
- [ ] Type in Server Name field → verify state updates
- [ ] Type in IP Address field → verify state updates (monospace font maintained)
- [ ] Type in DNS Address field → verify state updates
- [ ] Select different server → verify form resets to new server values
- [ ] Verify no console errors during state updates

**9. Build Verification:**
- [ ] Run `npm run build` (frontend)
- [ ] Verify no TypeScript errors
- [ ] Verify no ESLint warnings
- [ ] Verify build completes successfully

**Expected Behavior:**
- Form is purely visual/structural for Story 2.2
- No validation yet (added in Story 2.3)
- No save functionality yet (added in Story 2.6)
- Fields should accept any input (no format checking yet)

**Edge Cases:**
- Server with missing DNS field → verify shows empty input (not undefined)
- Server with very long name → verify input doesn't overflow
- Rapidly switching between servers → verify form updates correctly
- Empty server object → verify form doesn't crash

**Browser Testing:**
- Primary: Firefox (per PRD browser support)
- Secondary: Chrome (should work, not primary test target)

### References

- [Source: docs/epics.md#story-2.2]
- [Source: docs/tech-spec-epic-2.md#section-2.3-component-breakdown]
- [Source: docs/architecture.md#component-architecture (section 4)]
- [Source: docs/ux-design-specification.md#6.1-formsection-formrow-formgroup-components]
- [Source: docs/ux-design-specification.md#5.1-critical-user-paths (Journey 2: Edit Server, Step 2)]
- [Source: docs/prd.md#FR6 (Edit existing server configuration)]
- [Source: docs/prd.md#FR11 (View server details in right panel)]
- [Source: stories/2-1-create-server-edit-form-layout-with-panel-header.md#completion-notes-list]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-2-build-basic-server-information-form-section.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-19: Story drafted by SM agent (Bob) - Created Story 2.2 with complete acceptance criteria, tasks, dev notes, learnings from Story 2.1, architecture alignment, and testing strategy. Second story in Epic 2 (Server Management). Establishes reusable form components (FormSection, FormRow, FormGroup) and implements Basic Information section with 2x2 field grid.
