/**
 * Maintenance Report Detail Display Tests
 * Tests if all data from maintenance report creation is properly displayed in the detail view
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MaintenanceReportDetailDrawer from '@/app/(admin-dashboard)/equipments/components/modals/MaintenanceReportDetailDrawer';

// Mock Zustand stores
const mockEquipmentsStore = {
  selectedMaintenanceReportForDetail: null,
  isMaintenanceReportDetailOpen: true,
  isMobile: false,
  setIsMaintenanceReportDetailOpen: jest.fn(),
  setSelectedMaintenanceReportForDetail: jest.fn(),
  setSelectedMaintenanceReportForEdit: jest.fn(),
  setIsEditMaintenanceReportDrawerOpen: jest.fn(),
  setIsModalOpen: jest.fn(),
};

jest.mock('@/stores/equipmentsStore', () => ({
  useEquipmentsStore: jest.fn((selector) => {
    if (selector) {
      return selector(mockEquipmentsStore);
    }
    return mockEquipmentsStore;
  }),
  selectIsMobile: (state: any) => state.isMobile,
}));

// Mock server state hooks
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useDeleteEquipmentMaintenanceReport: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false
  }))
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

describe('Maintenance Report Detail Display', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  // Complete maintenance report data as created through CreateEquipmentMaintenanceReportModal
  const completeMaintenanceReportData = {
    id: 'maintenance-report-detail-123',
    equipment_id: 'equipment-456',
    
    // Basic report information
    issue_description: 'Hydraulic system leak detected in main boom cylinder during routine operation',
    priority: 'HIGH' as const,
    status: 'IN_PROGRESS' as const,
    
    // Date information
    date_reported: '2024-01-20T09:15:30Z',
    date_repaired: '2024-01-22T16:45:00Z',
    downtime_hours: 8,
    
    // User information
    reported_user: {
      id: 'user-reporter-123',
      full_name: 'Mike Johnson',
      email: 'mike.johnson@company.com'
    },
    repaired_user: {
      id: 'user-repair-456',
      full_name: 'Tom Rodriguez',
      email: 'tom.rodriguez@company.com'
    },
    
    // Location information
    location: {
      id: 'location-789',
      address: '123 Main Street Construction Site, Downtown'
    },
    
    // Detailed descriptions
    inspection_details: `Initial inspection performed at 09:00 AM on January 20th, 2024.
    
Observed symptoms:
- Visible hydraulic fluid pooling under equipment
- Reduced lifting capacity on main boom
- Unusual noise during boom extension
- Slow response in hydraulic controls

Visual inspection revealed:
- Damaged hydraulic seal in main boom cylinder
- Wear on cylinder rod surface
- Contamination in hydraulic fluid

Pressure test results:
- Main system pressure: 2800 PSI (normal: 3200 PSI)
- Boom cylinder pressure drop: 15% under load
- Fluid contamination level: High

Immediate action taken:
- Equipment taken out of service
- Work area secured and marked
- Supervisor notified immediately`,

    action_taken: `Emergency shutdown procedure followed immediately upon discovery.

Repair steps performed:
1. Drained hydraulic system completely
2. Removed main boom cylinder assembly
3. Disassembled cylinder and inspected components
4. Replaced damaged hydraulic seal (part #HS-320D-001)
5. Replaced worn O-ring gaskets (part #OR-320D-003)
6. Machined and polished cylinder rod surface
7. Replaced contaminated hydraulic fluid (15 gallons)
8. Reassembled cylinder with new components
9. Reinstalled cylinder assembly
10. Pressure tested system (3200 PSI for 30 minutes)
11. Functional testing - all operations normal
12. Final inspection and sign-off

Quality checks completed:
- No leaks detected after 4-hour operational test
- Full pressure maintained under maximum load
- All hydraulic functions responding normally
- Fluid cleanliness within specification`,

    remarks: `This failure was caused by normal wear after 2,800 operating hours. The hydraulic seal was approaching end of service life.

Recommendations for prevention:
- Implement monthly hydraulic fluid analysis
- Reduce service interval from 6 months to 4 months for hydraulic components
- Consider upgrading to heavy-duty seals for high-usage equipment
- Train operators on early warning signs of hydraulic issues

Parts warranty: All replaced parts covered under 12-month warranty
Next scheduled inspection: March 20th, 2024

Cost breakdown:
- Parts: $245.00
- Labor: 8 hours @ $85/hour = $680.00
- Hydraulic fluid: $120.00
- Total: $1,045.00`,

    // Parts replaced during maintenance
    parts_replaced: [
      'Hydraulic seal - Main boom cylinder (HS-320D-001)',
      'O-ring gasket set - Boom cylinder (OR-320D-003)',
      'Hydraulic fluid - ISO 46 (15 gallons)',
      'Filter element - Return line (FT-320D-007)'
    ],
    
    // Attachment URLs - images and documents from maintenance
    attachment_urls: [
      'https://storage.supabase.co/maintenance/leak-inspection-photo.jpg',
      'https://storage.supabase.co/maintenance/damaged-seal-closeup.jpg',
      'https://storage.supabase.co/maintenance/new-parts-before-install.jpg',
      'https://storage.supabase.co/maintenance/pressure-test-results.pdf',
      'https://storage.supabase.co/maintenance/completed-repair-photo.jpg'
    ]
  };

  describe('Report Details Tab - All Creation Fields', () => {
    it('should display all basic maintenance report information', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Maintenance Report Details')).toBeInTheDocument();
      });

      // Issue description (header)
      expect(screen.getByText('Hydraulic system leak detected in main boom cylinder during routine operation')).toBeInTheDocument();

      // Status and priority badges
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('HIGH Priority')).toBeInTheDocument();

      // Date information
      expect(screen.getByText('Reported:')).toBeInTheDocument();
      expect(screen.getByText('Completed:')).toBeInTheDocument();
      expect(screen.getByText('8 hours')).toBeInTheDocument(); // Downtime

      // User information
      expect(screen.getByText('Reported by:')).toBeInTheDocument();
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      expect(screen.getByText('Repaired by:')).toBeInTheDocument();
      expect(screen.getByText('Tom Rodriguez')).toBeInTheDocument();

      // Location information
      expect(screen.getByText('Location:')).toBeInTheDocument();
      expect(screen.getByText('123 Main Street Construction Site, Downtown')).toBeInTheDocument();
    });

    it('should display detailed inspection details section', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Inspection Details')).toBeInTheDocument();
      });

      // Should display the full inspection details text
      expect(screen.getByText(/Initial inspection performed at 09:00 AM/)).toBeInTheDocument();
      expect(screen.getByText(/Visible hydraulic fluid pooling under equipment/)).toBeInTheDocument();
      expect(screen.getByText(/Pressure test results:/)).toBeInTheDocument();
      expect(screen.getByText(/Main system pressure: 2800 PSI/)).toBeInTheDocument();
    });

    it('should display detailed action taken section', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Action Taken')).toBeInTheDocument();
      });

      // Should display the full action taken text
      expect(screen.getByText(/Emergency shutdown procedure followed immediately/)).toBeInTheDocument();
      expect(screen.getByText(/Drained hydraulic system completely/)).toBeInTheDocument();
      expect(screen.getByText(/Pressure tested system \(3200 PSI for 30 minutes\)/)).toBeInTheDocument();
      expect(screen.getByText(/Quality checks completed:/)).toBeInTheDocument();
    });

    it('should display additional remarks section', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Additional Remarks')).toBeInTheDocument();
      });

      // Should display the full remarks text
      expect(screen.getByText(/This failure was caused by normal wear after 2,800 operating hours/)).toBeInTheDocument();
      expect(screen.getByText(/Recommendations for prevention:/)).toBeInTheDocument();
      expect(screen.getByText(/Implement monthly hydraulic fluid analysis/)).toBeInTheDocument();
      expect(screen.getByText(/Cost breakdown:/)).toBeInTheDocument();
      expect(screen.getByText(/Total: \$1,045.00/)).toBeInTheDocument();
    });
  });

  describe('Parts Replaced Tab - Detailed Parts Display', () => {
    it('should display all parts replaced during maintenance', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts replaced/i }));

      await waitFor(() => {
        expect(screen.getByText('Parts Replaced')).toBeInTheDocument();
      });

      // Should show all 4 parts that were replaced
      expect(screen.getByText('Hydraulic seal - Main boom cylinder (HS-320D-001)')).toBeInTheDocument();
      expect(screen.getByText('O-ring gasket set - Boom cylinder (OR-320D-003)')).toBeInTheDocument();
      expect(screen.getByText('Hydraulic fluid - ISO 46 (15 gallons)')).toBeInTheDocument();
      expect(screen.getByText('Filter element - Return line (FT-320D-007)')).toBeInTheDocument();

      // Count badge should show 4 parts
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should display associated images for parts', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts replaced/i }));

      await waitFor(() => {
        expect(screen.getByText('Parts Replaced')).toBeInTheDocument();
      });

      // First part should have associated image (leak-inspection-photo.jpg)
      const firstPartImage = screen.getByAltText('Part: Hydraulic seal - Main boom cylinder (HS-320D-001)');
      expect(firstPartImage).toBeInTheDocument();
      expect(firstPartImage).toHaveAttribute('src', completeMaintenanceReportData.attachment_urls[0]);

      // Click to view full image functionality
      expect(screen.getByText('Click to view full image')).toBeInTheDocument();
    });
  });

  describe('Attachments Tab - File Display', () => {
    it('should display all attachments from maintenance report creation', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      await waitFor(() => {
        expect(screen.getByText('Attachments & Images')).toBeInTheDocument();
      });

      // Should display all 5 attachments
      expect(screen.getByAltText('Attachment 1')).toBeInTheDocument();
      expect(screen.getByAltText('Attachment 2')).toBeInTheDocument();
      expect(screen.getByAltText('Attachment 3')).toBeInTheDocument();
      // 4th attachment is PDF, should show as file
      expect(screen.getByText('Attachment 4')).toBeInTheDocument();
      expect(screen.getByAltText('Attachment 5')).toBeInTheDocument();

      // Count badge should show 5 attachments
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle different file types in attachments', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      await waitFor(() => {
        expect(screen.getByText('Attachments & Images')).toBeInTheDocument();
      });

      // Images should be displayed with preview
      const imageAttachment = screen.getByAltText('Attachment 1');
      expect(imageAttachment).toHaveAttribute('src', completeMaintenanceReportData.attachment_urls[0]);

      // PDF should be displayed as downloadable file
      expect(screen.getByText('pressure-test-results.pdf')).toBeInTheDocument();
    });

    it('should open image viewer when clicking on images', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      // Click on first attachment image
      const firstImage = screen.getByAltText('Attachment 1');
      await user.click(firstImage);

      // Image viewer modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation and Data Persistence', () => {
    it('should show correct counts in all tab badges', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Maintenance Report Details')).toBeInTheDocument();
      });

      // Parts tab should show count of 4
      const partsTab = screen.getByRole('button', { name: /parts replaced/i });
      expect(partsTab).toBeInTheDocument();
      
      // Attachments tab should show count of 5
      const attachmentsTab = screen.getByRole('button', { name: /attachments/i });
      expect(attachmentsTab).toBeInTheDocument();
    });

    it('should maintain data when switching between tabs', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Start on Details tab - verify data
      await waitFor(() => {
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      });

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts replaced/i }));
      expect(screen.getByText('Hydraulic seal - Main boom cylinder (HS-320D-001)')).toBeInTheDocument();

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));
      expect(screen.getByAltText('Attachment 1')).toBeInTheDocument();

      // Switch back to Details tab - data should still be there
      await user.click(screen.getByRole('button', { name: /report details/i }));
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      expect(screen.getByText('Tom Rodriguez')).toBeInTheDocument();
    });
  });

  describe('Missing Data Handling', () => {
    it('should handle maintenance report with minimal data', async () => {
      const minimalReportData = {
        id: 'minimal-report-123',
        equipment_id: 'equipment-456',
        issue_description: 'Basic maintenance issue',
        priority: 'MEDIUM' as const,
        status: 'REPORTED' as const,
        date_reported: '2024-01-20T09:15:30Z',
        reported_user: {
          id: 'user-123',
          full_name: 'Basic User'
        }
      };

      mockEquipmentsStore.selectedMaintenanceReportForDetail = minimalReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Basic maintenance issue')).toBeInTheDocument();
      });

      // Basic fields should display
      expect(screen.getByText('MEDIUM Priority')).toBeInTheDocument();
      expect(screen.getByText('REPORTED')).toBeInTheDocument();
      expect(screen.getByText('Basic User')).toBeInTheDocument();
    });

    it('should show appropriate messages when no parts or attachments', async () => {
      const user = userEvent.setup();
      const reportWithoutPartsOrAttachments = {
        ...completeMaintenanceReportData,
        parts_replaced: [],
        attachment_urls: []
      };

      mockEquipmentsStore.selectedMaintenanceReportForDetail = reportWithoutPartsOrAttachments;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Check Parts tab
      await user.click(screen.getByRole('button', { name: /parts replaced/i }));
      expect(screen.getByText('No parts were replaced in this maintenance')).toBeInTheDocument();

      // Check Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));
      expect(screen.getByText('No attachments available for this report')).toBeInTheDocument();
    });
  });

  describe('Actions and Navigation', () => {
    it('should provide edit and delete functionality', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = completeMaintenanceReportData;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Maintenance Report Details')).toBeInTheDocument();
      });

      // Edit and Delete buttons should be present
      expect(screen.getByRole('button', { name: /edit report/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete report/i })).toBeInTheDocument();
    });
  });
});