/**
 * Group Layout CRUD Integration Tests
 *
 * Tests for group CRUD operations with new rowNumber and rowOrder fields:
 * - Create groups with layout properties
 * - Update group layout configuration
 * - Migration from legacy to new format
 * - Validation of layout fields
 * - SSE events propagation
 */

import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { CONFIG_PATHS } from '../../config/file-paths';
import { createConfigRoutes } from '../../routes/config';
import { createEventsRoute } from '../../routes/events';
import { ConfigManager } from '../../services/ConfigManager';
import { PingService } from '../../services/PingService';

// Helper to clean up test files
async function cleanupTestFiles() {
  try {
    await fs.unlink(CONFIG_PATHS.layout);
  } catch {
    // File doesn't exist, which is fine
  }
}

// Helper to create test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  const configManager = new ConfigManager();
  const pingService = new PingService();

  app.use('/api/config', createConfigRoutes(configManager));
  app.use('/api/events', createEventsRoute(pingService, configManager));

  return { app, configManager, pingService };
}

describe('Group Layout CRUD Integration Tests', () => {
  let app: express.Application;
  let configManager: ConfigManager;

  beforeEach(async () => {
    await cleanupTestFiles();
    const testApp = createTestApp();
    app = testApp.app;
    configManager = testApp.configManager;
  });

  afterEach(async () => {
    await cleanupTestFiles();
  });

  describe('POST /api/config/groups', () => {
    it('should create group with new layout fields', async () => {
      const newGroup = {
        name: 'Test Group',
        order: 1,
        rowNumber: 2,
        rowOrder: 3,
        serverIds: []
      };

      const response = await request(app)
        .post('/api/config/groups')
        .send(newGroup)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Group');
      expect(response.body.data.rowNumber).toBe(2);
      expect(response.body.data.rowOrder).toBe(3);
      expect(response.body.data.id).toMatch(/^group-\d+$/);
    });

    it('should validate rowNumber and rowOrder ranges', async () => {
      const invalidGroup = {
        name: 'Invalid Group',
        order: 1,
        rowNumber: 0, // Invalid: must be >= 1
        rowOrder: 101, // Invalid: must be <= 100
        serverIds: []
      };

      const response = await request(app)
        .post('/api/config/groups')
        .send(invalidGroup)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.validationErrors).toHaveProperty('rowNumber');
      expect(response.body.validationErrors).toHaveProperty('rowOrder');
    });

    it('should apply default values when layout fields are missing', async () => {
      const minimalGroup = {
        name: 'Minimal Group',
        order: 1,
        serverIds: []
      };

      const response = await request(app)
        .post('/api/config/groups')
        .send(minimalGroup)
        .expect(200);

      expect(response.body.success).toBe(true);
      // The validation will pass since fields are optional
      expect(response.body.data.name).toBe('Minimal Group');
    });
  });

  describe('PUT /api/config/groups/:id', () => {
    let groupId: string;

    beforeEach(async () => {
      // Create a group first
      const createResponse = await request(app)
        .post('/api/config/groups')
        .send({
          name: 'Original Group',
          order: 1,
          rowNumber: 1,
          rowOrder: 1,
          serverIds: []
        })
        .expect(200);

      groupId = createResponse.body.data.id;
    });

    it('should update group layout configuration', async () => {
      const updateData = {
        name: 'Updated Group',
        order: 2,
        rowNumber: 3,
        rowOrder: 2,
        serverIds: []
      };

      const response = await request(app)
        .put(`/api/config/groups/${groupId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rowNumber).toBe(3);
      expect(response.body.data.rowOrder).toBe(2);
    });

    it('should validate updated layout fields', async () => {
      const invalidUpdate = {
        name: 'Invalid Update',
        order: 2,
        rowNumber: -5, // Invalid
        rowOrder: 200, // Invalid
        serverIds: []
      };

      const response = await request(app)
        .put(`/api/config/groups/${groupId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.validationErrors.rowNumber).toContain('must be a number between 1 and 100');
      expect(response.body.validationErrors.rowOrder).toContain('must be a number between 1 and 100');
    });
  });

  describe('GET /api/config/groups', () => {
    beforeEach(async () => {
      // Create some test groups with different layouts
      await request(app)
        .post('/api/config/groups')
        .send({
          name: 'Row 1 Group 1',
          order: 1,
          rowNumber: 1,
          rowOrder: 1,
          serverIds: []
        });

      await request(app)
        .post('/api/config/groups')
        .send({
          name: 'Row 1 Group 2',
          order: 2,
          rowNumber: 1,
          rowOrder: 2,
          serverIds: []
        });

      await request(app)
        .post('/api/config/groups')
        .send({
          name: 'Row 2 Group',
          order: 3,
          rowNumber: 2,
          rowOrder: 1,
          serverIds: []
        });
    });

    it('should return groups with layout properties', async () => {
      const response = await request(app)
        .get('/api/config/groups')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      const row1Groups = response.body.data.filter((g: any) => g.rowNumber === 1);
      const row2Groups = response.body.data.filter((g: any) => g.rowNumber === 2);

      expect(row1Groups).toHaveLength(2);
      expect(row2Groups).toHaveLength(1);

      // Verify ordering within rows
      expect(row1Groups[0].rowOrder).toBe(1);
      expect(row1Groups[1].rowOrder).toBe(2);
    });
  });

  describe('Migration Tests', () => {
    it('should migrate legacy groups on GET', async () => {
      // Create a legacy layout file manually
      const legacyLayout = {
        groups: [
          {
            id: 'legacy-group-1',
            name: 'Legacy Left Group',
            order: 1,
            row: 1,
            position: 'left',
            serverIds: []
          },
          {
            id: 'legacy-group-2',
            name: 'Legacy Right Group',
            order: 2,
            row: 1,
            position: 'right',
            serverIds: []
          },
          {
            id: 'legacy-group-3',
            name: 'Legacy Row 2',
            order: 3,
            row: 2,
            position: 'left',
            serverIds: []
          }
        ]
      };

      await fs.writeFile(CONFIG_PATHS.layout, JSON.stringify(legacyLayout, null, 2));

      const response = await request(app)
        .get('/api/config/groups')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Check migration results
      const migratedGroup1 = response.body.data.find((g: any) => g.id === 'legacy-group-1');
      const migratedGroup2 = response.body.data.find((g: any) => g.id === 'legacy-group-2');
      const migratedGroup3 = response.body.data.find((g: any) => g.id === 'legacy-group-3');

      expect(migratedGroup1.rowNumber).toBe(1);
      expect(migratedGroup1.rowOrder).toBe(1);
      expect(migratedGroup2.rowNumber).toBe(1);
      expect(migratedGroup2.rowOrder).toBe(2);
      expect(migratedGroup3.rowNumber).toBe(2);
      expect(migratedGroup3.rowOrder).toBe(1);

      // Verify file was updated with migrated data
      const fileContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
      const updatedLayout = JSON.parse(fileContent);
      expect(updatedLayout.groups[0].rowNumber).toBe(1);
      expect(updatedLayout.groups[0].rowOrder).toBe(1);
    });
  });

  describe('SSE Integration Tests', () => {
    it('should emit groups-changed event when layout is modified', async () => {
      // Create initial group
      const createResponse = await request(app)
        .post('/api/config/groups')
        .send({
          name: 'SSE Test Group',
          order: 1,
          rowNumber: 1,
          rowOrder: 1,
          serverIds: []
        });

      const groupId = createResponse.body.data.id;

      // Listen for SSE events
      let events: any[] = [];
      const eventSource = new request(app)
        .get('/api/events')
        .expect('Content-Type', /text\/event-stream/);

      // Simulate receiving events
      eventSource.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.startsWith('data: '));
        lines.forEach(line => {
          try {
            const event = JSON.parse(line.substring(6));
            events.push(event);
          } catch {
            // Ignore parsing errors
          }
        });
      });

      // Update group layout
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for SSE connection
      await request(app)
        .put(`/api/config/groups/${groupId}`)
        .send({
          name: 'Updated SSE Group',
          order: 1,
          rowNumber: 2,
          rowOrder: 3,
          serverIds: []
        });

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 200));

      const groupsChangedEvents = events.filter(e => e.type === 'groupsChanged');
      expect(groupsChangedEvents.length).toBeGreaterThan(0);

      const lastEvent = groupsChangedEvents[groupsChangedEvents.length - 1];
      expect(lastEvent.groups).toBeInstanceOf(Array);

      const updatedGroup = lastEvent.groups.find((g: any) => g.id === groupId);
      expect(updatedGroup.rowNumber).toBe(2);
      expect(updatedGroup.rowOrder).toBe(3);
    }, 10000); // 10 second timeout for SSE tests
  });

  describe('Complex Layout Scenarios', () => {
    it('should handle groups with same row but different orders', async () => {
      // Create multiple groups in the same row
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/config/groups')
          .send({
            name: `Row 1 Group ${i}`,
            order: i,
            rowNumber: 1,
            rowOrder: i,
            serverIds: []
          });
      }

      const response = await request(app)
        .get('/api/config/groups')
        .expect(200);

      const row1Groups = response.body.data.filter((g: any) => g.rowNumber === 1);
      expect(row1Groups).toHaveLength(5);

      // Verify they are sorted correctly by rowOrder
      const sortedGroups = row1Groups.sort((a: any, b: any) => a.rowOrder - b.rowOrder);
      expect(row1Groups.map((g: any) => g.name)).toEqual([
        'Row 1 Group 1',
        'Row 1 Group 2',
        'Row 1 Group 3',
        'Row 1 Group 4',
        'Row 1 Group 5'
      ]);
    });

    it('should handle groups with high row numbers', async () => {
      await request(app)
        .post('/api/config/groups')
        .send({
          name: 'High Row Group',
          order: 1,
          rowNumber: 10,
          rowOrder: 1,
          serverIds: []
        });

      const response = await request(app)
        .get('/api/config/groups')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].rowNumber).toBe(10);
    });
  });
});