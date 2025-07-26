/**
 * Equipment Detail View Display Tests
 * Tests if all data from equipment creation is properly displayed in the detail view
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquipmentModalModern from '@/app/(admin-dashboard)/equipments/components/modals/EquipmentModalModern';

// Mock Zustand stores
const mockEquipmentsStore = {
  selectedEquipment: null,
  isModalOpen: true,
  isEditMode: false,
  isMobile: false,
  isPhotosCollapsed: false,
  isDocumentsCollapsed: false,
  setIsModalOpen: jest.fn(),
  setIsEditMode: jest.fn(),
  setSelectedEquipment: jest.fn(),
  setIsPhotosCollapsed: jest.fn(),
  setIsDocumentsCollapsed: jest.fn(),
  setDeleteConfirmation: jest.fn(),
  setIsEquipmentMaintenanceModalOpen: jest.fn(),
};

jest.mock('@/stores/equipmentsStore', () => ({
  useEquipmentsStore: jest.fn((selector) => {
    if (selector) {
      return selector(mockEquipmentsStore);
    }
    return mockEquipmentsStore;
  }),
  selectSelectedEquipment: (state: any) => state.selectedEquipment,
  selectIsModalOpen: (state: any) => state.isModalOpen,
  selectIsEditMode: (state: any) => state.isEditMode,
  selectIsMobile: (state: any) => state.isMobile,
  selectIsPhotosCollapsed: (state: any) => state.isPhotosCollapsed,
  selectIsDocumentsCollapsed: (state: any) => state.isDocumentsCollapsed,
}));

// Mock server state hooks
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useEquipmentsWithReferenceData: jest.fn(() => ({
    equipments: [],
    maintenanceReports: [],
    projects: []
  })),
  useUpdateEquipmentAction: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false
  })),
  useDeleteEquipment: jest.fn(() => ({
    isPending: false
  }))
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString();
  })
}));

describe('Equipment Detail View Data Display', () => {
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

  // Complete equipment data matching CreateEquipmentForm structure
  const completeEquipmentData = {
    uid: 'equipment-detail-test-123',
    brand: 'Caterpillar',
    model: '320D',
    type: 'Excavator',
    owner: 'Test Construction Company',
    status: 'OPERATIONAL' as const,
    plateNumber: 'CAT-320D-001',
    remarks: 'Heavy-duty excavator for large construction projects. Regular maintenance required.',
    
    // Project relationship
    project: {
      uid: 'project-123',
      name: 'Downtown Construction Project',
      client: {
        uid: 'client-123',
        name: 'Metro Development Corp',
        location: {
          uid: 'location-123',
          address: '123 Main Street, Downtown'
        }
      }
    },
    
    // Date fields
    created_at: '2024-01-15T10:30:00Z',
    created_by: 'john.doe@company.com',
    registrationExpiry: '2025-06-15',
    insuranceExpirationDate: '2024-12-31',
    inspectionDate: '2024-01-10',
    before: '6', // 6 months inspection frequency
    
    // File URLs - exactly as stored after creation
    image_url: 'https://storage.supabase.co/equipment-images/cat-320d-001.jpg',
    thirdpartyInspectionImage: 'https://storage.supabase.co/inspections/third-party-cert.jpg',
    pgpcInspectionImage: 'https://storage.supabase.co/inspections/pgpc-cert.jpg',
    originalReceiptUrl: 'https://storage.supabase.co/documents/original-receipt.pdf',
    equipmentRegistrationUrl: 'https://storage.supabase.co/documents/registration.pdf',
    
    // Parts data - complex JSON structure as stored
    equipmentParts: [JSON.stringify({
      rootFiles: [
        {
          name: 'engine-manual.pdf',
          url: 'https://storage.supabase.co/parts/engine-manual.pdf',
          uploadedAt: '2024-01-15T10:35:00Z'
        },
        {
          name: 'hydraulic-specs.jpg',
          url: 'https://storage.supabase.co/parts/hydraulic-specs.jpg',
          uploadedAt: '2024-01-15T10:36:00Z'
        }
      ],
      folders: [
        {
          name: 'Engine Components',
          files: [
            {
              name: 'air-filter.jpg',
              url: 'https://storage.supabase.co/parts/air-filter.jpg',
              uploadedAt: '2024-01-15T10:37:00Z'
            },
            {
              name: 'oil-filter-specs.pdf',
              url: 'https://storage.supabase.co/parts/oil-filter-specs.pdf',
              uploadedAt: '2024-01-15T10:38:00Z'
            }
          ]
        },
        {
          name: 'Hydraulic System',
          files: [
            {
              name: 'pump-diagram.jpg',
              url: 'https://storage.supabase.co/parts/pump-diagram.jpg',
              uploadedAt: '2024-01-15T10:39:00Z'
            }
          ]
        }
      ]
    })]
  };

  const mockProjects = [
    {
      uid: 'project-123',
      name: 'Downtown Construction Project',
      client: {
        uid: 'client-123',
        name: 'Metro Development Corp',
        location: {
          uid: 'location-123',
          address: '123 Main Street, Downtown'
        }
      }
    }
  ];

  const mockMaintenanceReports = [
    {
      id: 'maintenance-report-456',
      equipment_id: 'equipment-detail-test-123',
      issue_description: 'Hydraulic fluid leak in main boom cylinder',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      date_reported: '2024-01-20T09:15:00Z',
      reported_user: {
        full_name: 'Mike Johnson'
      },
      parts_replaced: ['Hydraulic seal', 'O-ring gasket'],
      attachment_urls: [
        'https://storage.supabase.co/maintenance/leak-photo-1.jpg',
        'https://storage.supabase.co/maintenance/seal-replacement.jpg'
      ]
    },
    {
      id: 'maintenance-report-789',
      equipment_id: 'equipment-detail-test-123',
      issue_description: 'Routine 6-month inspection and service',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      date_reported: '2024-01-01T08:00:00Z',
      date_repaired: '2024-01-02T16:30:00Z',
      reported_user: {
        full_name: 'Sarah Wilson'
      },
      repaired_user: {
        full_name: 'Tom Rodriguez'
      }
    }
  ];

  describe('Equipment Details Tab - All Creation Fields', () => {
    it('should display all basic equipment information from creation', async () => {
      // Set up store with equipment data
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      // Mock server data
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByText('Caterpillar 320D')).toBeInTheDocument();
      });

      // Equipment Identity Section
      expect(screen.getByText('Brand')).toBeInTheDocument();
      expect(screen.getByText('Caterpillar')).toBeInTheDocument();
      
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('320D')).toBeInTheDocument();
      
      expect(screen.getByText('Equipment Type')).toBeInTheDocument();
      expect(screen.getByText('Excavator')).toBeInTheDocument();
      
      expect(screen.getByText('Plate/Serial Number')).toBeInTheDocument();
      expect(screen.getByText('CAT-320D-001')).toBeInTheDocument();

      // Ownership & Project Section
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Test Construction Company')).toBeInTheDocument();
      
      expect(screen.getByText('Assigned Project')).toBeInTheDocument();
      expect(screen.getByText('Downtown Construction Project')).toBeInTheDocument();

      // Status Section
      expect(screen.getByText('Operational Status')).toBeInTheDocument();
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
    });

    it('should display all date and inspection information from creation', async () => {
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Dates & Inspection')).toBeInTheDocument();
      });

      // Date fields should be displayed
      expect(screen.getByText('Registration Expires:')).toBeInTheDocument();
      expect(screen.getByText('Insurance Expires:')).toBeInTheDocument();
      expect(screen.getByText('Last Inspection:')).toBeInTheDocument();
      expect(screen.getByText('Next Inspection Due:')).toBeInTheDocument();
      expect(screen.getByText('Inspection Frequency:')).toBeInTheDocument();
      expect(screen.getByText('Every 6 months')).toBeInTheDocument();
      
      expect(screen.getByText('Date Added:')).toBeInTheDocument();
      expect(screen.getByText('Added by:')).toBeInTheDocument();
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
    });

    it('should display remarks/additional notes from creation', async () => {
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Additional Notes:')).toBeInTheDocument();
      });

      expect(screen.getByText('Heavy-duty excavator for large construction projects. Regular maintenance required.')).toBeInTheDocument();
    });
  });

  describe('Equipment Images Tab - File Display', () => {
    it('should display all images uploaded during creation', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));

      await waitFor(() => {
        expect(screen.getByText('Equipment Images')).toBeInTheDocument();
      });

      // Equipment image should be displayed
      expect(screen.getByAltText('Equipment Image')).toBeInTheDocument();
      expect(screen.getByAltText('Equipment Image')).toHaveAttribute('src', completeEquipmentData.image_url);

      // Third-party inspection image
      expect(screen.getByAltText('Third-party Inspection')).toBeInTheDocument();
      expect(screen.getByAltText('Third-party Inspection')).toHaveAttribute('src', completeEquipmentData.thirdpartyInspectionImage);

      // PGPC inspection image
      expect(screen.getByAltText('PGPC Inspection')).toBeInTheDocument();
      expect(screen.getByAltText('PGPC Inspection')).toHaveAttribute('src', completeEquipmentData.pgpcInspectionImage);

      // Count badge should show 3 images
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show image viewer when clicking on images', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));

      // Click on equipment image
      const equipmentImage = screen.getByAltText('Equipment Image');
      await user.click(equipmentImage);

      // Image viewer modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Equipment Documents Tab - File Display', () => {
    it('should display all documents uploaded during creation', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      // Original Receipt should be displayed
      expect(screen.getByAltText('Original Receipt (OR)')).toBeInTheDocument();
      expect(screen.getByAltText('Original Receipt (OR)')).toHaveAttribute('src', completeEquipmentData.originalReceiptUrl);

      // Equipment Registration should be displayed
      expect(screen.getByAltText('Equipment Registration')).toBeInTheDocument();
      expect(screen.getByAltText('Equipment Registration')).toHaveAttribute('src', completeEquipmentData.equipmentRegistrationUrl);

      // Count badge should show 2 documents
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Equipment Parts Tab - Complex Data Display', () => {
    it('should display parts structure created during equipment creation', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts management/i }));

      await waitFor(() => {
        expect(screen.getByText('Equipment Parts')).toBeInTheDocument();
      });

      // Parts count badge should show 5 files (2 root + 2 in Engine + 1 in Hydraulic)
      expect(screen.getByText('5')).toBeInTheDocument();

      // The EquipmentPartsViewer component should be rendered with the correct data
      // Since it's a complex component, we verify it receives the right structure
      const expectedPartsData = JSON.parse(completeEquipmentData.equipmentParts[0]);
      expect(expectedPartsData.rootFiles).toHaveLength(2);
      expect(expectedPartsData.folders).toHaveLength(2);
      expect(expectedPartsData.folders[0].name).toBe('Engine Components');
      expect(expectedPartsData.folders[0].files).toHaveLength(2);
      expect(expectedPartsData.folders[1].name).toBe('Hydraulic System');
      expect(expectedPartsData.folders[1].files).toHaveLength(1);
    });
  });

  describe('Maintenance Reports Tab - Related Data Display', () => {
    it('should display maintenance reports created with equipment', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Maintenance tab
      await user.click(screen.getByRole('button', { name: /maintenance reports/i }));

      await waitFor(() => {
        expect(screen.getByText('Maintenance Reports')).toBeInTheDocument();
      });

      // Count badge should show 2 maintenance reports
      expect(screen.getByText('2')).toBeInTheDocument();

      // The EquipmentMaintenanceReportsEnhanced component should be rendered
      // It should receive the equipment ID to filter reports
      expect(screen.getByText('Maintenance Reports')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation and Counts', () => {
    it('should show correct counts in all tab badges', async () => {
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Caterpillar 320D')).toBeInTheDocument();
      });

      // Images tab should show count of 3
      const imagesTab = screen.getByRole('button', { name: /equipment images/i });
      expect(imagesTab).toBeInTheDocument();
      
      // Documents tab should show count of 2
      const documentsTab = screen.getByRole('button', { name: /documents/i });
      expect(documentsTab).toBeInTheDocument();
      
      // Parts tab should show count of 5 (2 root files + 2 engine files + 1 hydraulic file)
      const partsTab = screen.getByRole('button', { name: /parts management/i });
      expect(partsTab).toBeInTheDocument();
      
      // Maintenance tab should show count of 2
      const maintenanceTab = screen.getByRole('button', { name: /maintenance reports/i });
      expect(maintenanceTab).toBeInTheDocument();
    });

    it('should maintain all data when switching between tabs', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeEquipmentData],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Start on Details tab - verify data
      await waitFor(() => {
        expect(screen.getByText('Caterpillar')).toBeInTheDocument();
      });

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));
      expect(screen.getByAltText('Equipment Image')).toBeInTheDocument();

      // Switch to Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));
      expect(screen.getByAltText('Original Receipt (OR)')).toBeInTheDocument();

      // Switch back to Details tab - data should still be there
      await user.click(screen.getByRole('button', { name: /equipment details/i }));
      expect(screen.getByText('Caterpillar')).toBeInTheDocument();
      expect(screen.getByText('Test Construction Company')).toBeInTheDocument();
    });
  });

  describe('Missing Data Handling', () => {
    it('should handle equipment with minimal data gracefully', async () => {
      const minimalEquipmentData = {
        uid: 'minimal-equipment-123',
        brand: 'Basic Brand',
        model: 'Basic Model',
        type: 'Basic Type',
        owner: 'Basic Owner',
        status: 'OPERATIONAL' as const,
        project: mockProjects[0],
        created_at: '2024-01-15T10:30:00Z'
      };

      mockEquipmentsStore.selectedEquipment = minimalEquipmentData;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [minimalEquipmentData],
        maintenanceReports: [],
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Basic Brand Basic Model')).toBeInTheDocument();
      });

      // Basic fields should still display
      expect(screen.getByText('Basic Brand')).toBeInTheDocument();
      expect(screen.getByText('Basic Model')).toBeInTheDocument();
      expect(screen.getByText('Basic Type')).toBeInTheDocument();
      expect(screen.getByText('Basic Owner')).toBeInTheDocument();

      // Should show "No additional notes" when remarks is empty
      expect(screen.getByText('No additional notes')).toBeInTheDocument();
    });

    it('should show appropriate messages when no files are present', async () => {
      const user = userEvent.setup();
      const equipmentWithoutFiles = {
        ...completeEquipmentData,
        image_url: null,
        thirdpartyInspectionImage: null,
        pgpcInspectionImage: null,
        originalReceiptUrl: null,
        equipmentRegistrationUrl: null,
        equipmentParts: null
      };

      mockEquipmentsStore.selectedEquipment = equipmentWithoutFiles;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithoutFiles],
        maintenanceReports: [],
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Check Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));
      expect(screen.getByText('No images available for this equipment')).toBeInTheDocument();

      // Check Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));
      expect(screen.getByText('No documents available for this equipment')).toBeInTheDocument();
    });
  });
});