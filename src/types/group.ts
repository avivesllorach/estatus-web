// Group configuration (from dashboard-layout.json)
export interface GroupConfig {
  id: string;                      // "group-1"
  name: string;                   // "ARAGÓ"
  order: number;                  // 1, 2, 3... (display order) - DEPRECATED, use row/position/order
  row?: number;                   // 1-4 (which row the group belongs to) - DEPRECATED, use rowNumber
  position?: 'left' | 'right';    // 'left' or 'right' position within the row - DEPRECATED, use rowOrder
  serverIds: string[];            // ["server-001", "server-002"]

  // New flexible layout properties
  rowNumber?: number;             // Which row the group belongs to (1, 2, 3, ...)
  rowOrder?: number;              // Position within the row (1, 2, 3, ...) - determines left-to-right order
}
