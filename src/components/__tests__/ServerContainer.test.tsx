import { render, screen } from '@testing-library/react';
import { ServerContainer } from '../ServerContainer';

// Mock DeviceCard component
jest.mock('../DeviceCard', () => {
  return function MockDeviceCard({ name, ip, isOnline }: any) {
    return (
      <div data-testid={`device-card-${name}`} data-online={isOnline}>
        {name} - {ip}
      </div>
    );
  };
});

describe('ServerContainer Component', () => {
  const mockServers = [
    {
      id: 'server-001',
      name: 'Test Server 1',
      ip: '192.168.1.10',
      isOnline: true,
      diskInfo: null,
    },
    {
      id: 'server-002',
      name: 'Test Server 2',
      ip: '192.168.1.11',
      isOnline: false,
      diskInfo: [
        {
          total: 1000,
          free: 500,
          used: 500,
          percentage: 50,
        },
      ],
    },
  ];

  describe('Basic Rendering', () => {
    it('should render container title', () => {
      render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={2}
        />
      );

      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    it('should render server cards', () => {
      render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={2}
        />
      );

      expect(screen.getByTestId('device-card-Test Server 1')).toBeInTheDocument();
      expect(screen.getByTestId('device-card-Test Server 2')).toBeInTheDocument();
    });

    it('should render empty container with no servers', () => {
      render(
        <ServerContainer
          title="Empty Group"
          servers={[]}
          serverCount={0}
        />
      );

      expect(screen.getByText('Empty Group')).toBeInTheDocument();
      expect(screen.queryByTestId(/device-card-/)).not.toBeInTheDocument();
    });

    it('should use server IDs as keys for React reconciliation', () => {
      const { rerender } = render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={2}
        />
      );

      // Update servers (same IDs, different data)
      const updatedServers = [
        {
          id: 'server-001',
          name: 'Updated Server 1',
          ip: '192.168.1.10',
          isOnline: false,
          diskInfo: null,
        },
        {
          id: 'server-002',
          name: 'Updated Server 2',
          ip: '192.168.1.11',
          isOnline: true,
          diskInfo: null,
        },
      ];

      rerender(
        <ServerContainer
          title="Test Group"
          servers={updatedServers}
          serverCount={2}
        />
      );

      expect(screen.getByTestId('device-card-Updated Server 1')).toBeInTheDocument();
      expect(screen.getByTestId('device-card-Updated Server 2')).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should have proper CSS classes for transitions', () => {
      const { container } = render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={2}
        />
      );

      const serverContainer = container.querySelector('.dashboard-layout-change');
      expect(serverContainer).toBeInTheDocument();

      const gridContainer = container.querySelector('.server-card-enter');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have server-container-enter class when servers exist', () => {
      const { container } = render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={2}
        />
      );

      const containerDiv = container.querySelector('.dashboard-layout-change');
      expect(containerDiv).toHaveClass('server-container-enter');
    });

    it('should not have server-container-enter class when empty', () => {
      const { container } = render(
        <ServerContainer
          title="Empty Group"
          servers={[]}
          serverCount={0}
        />
      );

      const containerDiv = container.querySelector('.dashboard-layout-change');
      expect(containerDiv).not.toHaveClass('server-container-enter');
    });

    it('should set correct grid template columns', () => {
      const { container } = render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={3}
        />
      );

      const gridDiv = container.querySelector('.server-card-enter');
      expect(gridDiv).toHaveStyle({
        gridTemplateColumns: 'repeat(3, 1fr)',
      });
    });

    it('should default to 1 column when serverCount is 0', () => {
      const { container } = render(
        <ServerContainer
          title="Test Group"
          servers={[]}
          serverCount={0}
        />
      );

      const gridDiv = container.querySelector('.server-card-enter');
      expect(gridDiv).toHaveStyle({
        gridTemplateColumns: 'repeat(1, 1fr)',
      });
    });
  });

  describe('Server Card Data Handling', () => {
    it('should pass correct props to DeviceCard', () => {
      render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={2}
        />
      );

      const deviceCard1 = screen.getByTestId('device-card-Test Server 1');
      expect(deviceCard1).toHaveAttribute('data-online', 'true');

      const deviceCard2 = screen.getByTestId('device-card-Test Server 2');
      expect(deviceCard2).toHaveAttribute('data-online', 'false');
    });

    it('should handle server with disk info', () => {
      const serversWithDiskInfo = [
        {
          id: 'server-001',
          name: 'Server with Disks',
          ip: '192.168.1.10',
          isOnline: true,
          diskInfo: [
            {
              total: 1000,
              free: 200,
              used: 800,
              percentage: 80,
              description: 'System Drive',
            },
            {
              total: 2000,
              free: 1000,
              used: 1000,
              percentage: 50,
              description: 'Data Drive',
            },
          ],
        },
      ];

      render(
        <ServerContainer
          title="Test Group"
          servers={serversWithDiskInfo}
          serverCount={1}
        />
      );

      expect(screen.getByTestId('device-card-Server with Disks')).toBeInTheDocument();
    });

    it('should handle server with null disk info', () => {
      const serversWithNullDisk = [
        {
          id: 'server-001',
          name: 'Server with Null Disk',
          ip: '192.168.1.10',
          isOnline: true,
          diskInfo: null,
        },
      ];

      render(
        <ServerContainer
          title="Test Group"
          servers={serversWithNullDisk}
          serverCount={1}
        />
      );

      expect(screen.getByTestId('device-card-Server with Null Disk')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle serverCount mismatch', () => {
      // serverCount is 3 but only 2 servers provided
      render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={3}
        />
      );

      expect(screen.getByTestId('device-card-Test Server 1')).toBeInTheDocument();
      expect(screen.getByTestId('device-card-Test Server 2')).toBeInTheDocument();

      // Should still use serverCount for grid layout
      const { container } = render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={3}
        />
      );

      const gridDiv = container.querySelector('.server-card-enter');
      expect(gridDiv).toHaveStyle({
        gridTemplateColumns: 'repeat(3, 1fr)',
      });
    });

    it('should handle undefined serverCount', () => {
      render(
        <ServerContainer
          title="Test Group"
          servers={mockServers}
          serverCount={undefined as any}
        />
      );

      expect(screen.getByTestId('device-card-Test Server 1')).toBeInTheDocument();
      expect(screen.getByTestId('device-card-Test Server 2')).toBeInTheDocument();
    });
  });
});