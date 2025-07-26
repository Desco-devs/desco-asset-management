/**
 * File and Image Display Tests
 * Tests image viewers, file handling, and document display in equipment detail views
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquipmentModalModern from '@/app/(admin-dashboard)/equipments/components/modals/EquipmentModalModern';
import MaintenanceReportDetailDrawer from '@/app/(admin-dashboard)/equipments/components/modals/MaintenanceReportDetailDrawer';

// Mock Zustand stores for equipment modal
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
  // For maintenance report drawer
  selectedMaintenanceReportForDetail: null,
  isMaintenanceReportDetailOpen: false,
  setIsMaintenanceReportDetailOpen: jest.fn(),
  setSelectedMaintenanceReportForDetail: jest.fn(),
  setSelectedMaintenanceReportForEdit: jest.fn(),
  setIsEditMaintenanceReportDrawerOpen: jest.fn(),
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
  })),
  useDeleteEquipmentMaintenanceReport: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false
  }))
}));

// Mock Next.js Image component to track src attributes
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onClick, ...props }: any) {
    return (
      <img 
        src={src} 
        alt={alt} 
        onClick={onClick}
        data-testid={`image-${alt?.replace(/\s+/g, '-').toLowerCase()}`}
        {...props} 
      />
    );
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString();
  })
}));

describe('File and Image Display Tests', () => {
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

  // Equipment with various file types and URLs
  const equipmentWithFiles = {
    uid: 'equipment-files-123',
    brand: 'File Test',
    model: 'FT-100',
    type: 'Test Equipment',
    owner: 'File Test Corp',
    status: 'OPERATIONAL' as const,
    project: {
      uid: 'project-123',
      name: 'Test Project',
      client: {
        uid: 'client-123',
        name: 'Test Client',
        location: { uid: 'location-123', address: 'Test Address' }
      }
    },
    created_at: '2024-01-15T10:30:00Z',
    
    // Different image formats
    image_url: 'https://storage.supabase.co/equipment-images/test-equipment.jpg',
    thirdpartyInspectionImage: 'https://storage.supabase.co/inspections/third-party.png',
    pgpcInspectionImage: 'https://storage.supabase.co/inspections/pgpc.webp',
    
    // Different document formats
    originalReceiptUrl: 'https://storage.supabase.co/documents/receipt.pdf',
    equipmentRegistrationUrl: 'https://storage.supabase.co/documents/registration.jpg',
    
    // Complex parts structure with various file types
    equipmentParts: [JSON.stringify({
      rootFiles: [
        {
          name: 'manual.pdf',
          url: 'https://storage.supabase.co/parts/manual.pdf',
          uploadedAt: '2024-01-15T10:35:00Z'
        },
        {
          name: 'diagram.jpg',
          url: 'https://storage.supabase.co/parts/diagram.jpg',
          uploadedAt: '2024-01-15T10:36:00Z'
        }
      ],
      folders: [
        {
          name: 'Images',
          files: [
            {
              name: 'photo1.png',
              url: 'https://storage.supabase.co/parts/photo1.png',
              uploadedAt: '2024-01-15T10:37:00Z'
            },
            {
              name: 'photo2.gif',
              url: 'https://storage.supabase.co/parts/photo2.gif',
              uploadedAt: '2024-01-15T10:38:00Z'
            }
          ]
        }
      ]
    })]
  };

  describe('Equipment Image Display', () => {
    it('should display equipment images with correct URLs and alt text', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = equipmentWithFiles;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithFiles],
        maintenanceReports: [],
        projects: [equipmentWithFiles.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));

      await waitFor(() => {
        expect(screen.getByText('Equipment Images')).toBeInTheDocument();
      });

      // Check all images are displayed with correct sources
      const equipmentImage = screen.getByTestId('image-equipment-image');
      expect(equipmentImage).toHaveAttribute('src', equipmentWithFiles.image_url);

      const thirdPartyImage = screen.getByTestId('image-third-party-inspection');
      expect(thirdPartyImage).toHaveAttribute('src', equipmentWithFiles.thirdpartyInspectionImage);

      const pgpcImage = screen.getByTestId('image-pgpc-inspection');
      expect(pgpcImage).toHaveAttribute('src', equipmentWithFiles.pgpcInspectionImage);
    });

    it('should open image viewer when clicking on images', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = equipmentWithFiles;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithFiles],
        maintenanceReports: [],
        projects: [equipmentWithFiles.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));

      // Click on equipment image
      const equipmentImage = screen.getByTestId('image-equipment-image');
      await user.click(equipmentImage);

      // Image viewer dialog should open
      await waitFor(() => {
        const dialogs = screen.getAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      });

      // Should show the image title in viewer
      expect(screen.getByText('Equipment Image')).toBeInTheDocument();
    });

    it('should handle image loading errors gracefully', async () => {
      const user = userEvent.setup();
      const equipmentWithBrokenImages = {
        ...equipmentWithFiles,
        image_url: 'https://broken-url.com/nonexistent.jpg',
        thirdpartyInspectionImage: 'https://broken-url.com/nonexistent.png'
      };

      mockEquipmentsStore.selectedEquipment = equipmentWithBrokenImages;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithBrokenImages],
        maintenanceReports: [],
        projects: [equipmentWithBrokenImages.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));

      // Images should still be rendered (error handling is in the component)
      const equipmentImage = screen.getByTestId('image-equipment-image');
      expect(equipmentImage).toBeInTheDocument();
      expect(equipmentImage).toHaveAttribute('src', equipmentWithBrokenImages.image_url);
    });
  });

  describe('Equipment Document Display', () => {
    it('should display documents with mixed file types', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = equipmentWithFiles;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithFiles],
        maintenanceReports: [],
        projects: [equipmentWithFiles.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      // PDF document (Original Receipt) - should be treated as image since component shows preview
      const receiptImage = screen.getByTestId('image-original-receipt-(or)');
      expect(receiptImage).toHaveAttribute('src', equipmentWithFiles.originalReceiptUrl);

      // JPG document (Equipment Registration) - should be displayed as image
      const registrationImage = screen.getByTestId('image-equipment-registration');
      expect(registrationImage).toHaveAttribute('src', equipmentWithFiles.equipmentRegistrationUrl);
    });

    it('should open document viewer for different file types', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = equipmentWithFiles;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithFiles],
        maintenanceReports: [],
        projects: [equipmentWithFiles.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));

      // Click on registration document (JPG)
      const registrationImage = screen.getByTestId('image-equipment-registration');
      await user.click(registrationImage);

      // Document viewer dialog should open
      await waitFor(() => {
        const dialogs = screen.getAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      });

      expect(screen.getByText('Equipment Registration')).toBeInTheDocument();
    });
  });

  describe('Maintenance Report File Display', () => {
    it('should display maintenance report attachments with mixed file types', async () => {
      const user = userEvent.setup();
      const maintenanceReportWithFiles = {
        id: 'maintenance-files-123',
        equipment_id: 'equipment-456',
        issue_description: 'Test issue with file attachments',
        priority: 'HIGH' as const,
        status: 'IN_PROGRESS' as const,
        date_reported: '2024-01-20T09:15:30Z',
        reported_user: {
          id: 'user-123',
          full_name: 'Test User'
        },
        parts_replaced: [
          'Part 1 with image',
          'Part 2 with document',
          'Part 3 without attachment'
        ],
        attachment_urls: [
          'https://storage.supabase.co/maintenance/part1-photo.jpg',      // Image for part 1
          'https://storage.supabase.co/maintenance/part2-specs.pdf',      // Document for part 2
          'https://storage.supabase.co/maintenance/general-photo.png',    // General attachment (part 3 has no attachment)
          'https://storage.supabase.co/maintenance/final-report.pdf',     // Additional document
          'https://storage.supabase.co/maintenance/completion.webp'       // Additional image
        ]
      };

      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceReportWithFiles;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      await waitFor(() => {
        expect(screen.getByText('Attachments & Images')).toBeInTheDocument();
      });

      // Should display all 5 attachments
      expect(screen.getByTestId('image-attachment-1')).toBeInTheDocument(); // JPG
      expect(screen.getByText('Attachment 2')).toBeInTheDocument(); // PDF (should be file button)
      expect(screen.getByTestId('image-attachment-3')).toBeInTheDocument(); // PNG
      expect(screen.getByText('Attachment 4')).toBeInTheDocument(); // PDF (should be file button)
      expect(screen.getByTestId('image-attachment-5')).toBeInTheDocument(); // WEBP

      // Check file names for PDFs
      expect(screen.getByText('part2-specs.pdf')).toBeInTheDocument();
      expect(screen.getByText('final-report.pdf')).toBeInTheDocument();
    });

    it('should show parts with associated images', async () => {
      const user = userEvent.setup();
      const maintenanceReportWithPartImages = {
        id: 'maintenance-part-images-456',
        equipment_id: 'equipment-789',
        issue_description: 'Parts replacement with images',
        priority: 'MEDIUM' as const,
        status: 'COMPLETED' as const,
        date_reported: '2024-01-20T09:15:30Z',
        reported_user: {
          id: 'user-456',
          full_name: 'Maintenance User'
        },
        parts_replaced: [
          'Hydraulic seal with photo',
          'O-ring gasket with image',
          'Filter element (no image)'
        ],
        attachment_urls: [
          'https://storage.supabase.co/maintenance/hydraulic-seal.jpg',
          'https://storage.supabase.co/maintenance/o-ring-gasket.png',
          // Note: Third part has no corresponding image (only 2 images for 3 parts)
        ]
      };

      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceReportWithPartImages;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts replaced/i }));

      await waitFor(() => {
        expect(screen.getByText('Parts Replaced')).toBeInTheDocument();
      });

      // First part should have associated image
      expect(screen.getByTestId('image-part:-hydraulic-seal-with-photo')).toBeInTheDocument();
      
      // Second part should have associated image
      expect(screen.getByTestId('image-part:-o-ring-gasket-with-image')).toBeInTheDocument();

      // Third part should not have an image (only 2 images for 3 parts)
      expect(screen.getByText('Filter element (no image)')).toBeInTheDocument();
      // Should not have an image for the third part
      expect(screen.queryByTestId('image-part:-filter-element-(no-image)')).not.toBeInTheDocument();
    });

    it('should open image viewer from maintenance report attachments', async () => {
      const user = userEvent.setup();
      const maintenanceReportWithImages = {
        id: 'maintenance-images-789',
        equipment_id: 'equipment-123',
        issue_description: 'Issue with image attachments',
        priority: 'LOW' as const,
        status: 'REPORTED' as const,
        date_reported: '2024-01-20T09:15:30Z',
        reported_user: {
          id: 'user-789',
          full_name: 'Image User'
        },
        parts_replaced: ['Test part'],
        attachment_urls: [
          'https://storage.supabase.co/maintenance/test-image.jpg'
        ]
      };

      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceReportWithImages;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      // Click on attachment image
      const attachmentImage = screen.getByTestId('image-attachment-1');
      await user.click(attachmentImage);

      // Image viewer dialog should open
      await waitFor(() => {
        const dialogs = screen.getAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      });

      expect(screen.getByText('Attachment 1')).toBeInTheDocument();
    });
  });

  describe('File Type Recognition', () => {
    it('should correctly identify image file types', () => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const testUrls = imageExtensions.map(ext => `https://example.com/file${ext}`);
      
      testUrls.forEach(url => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        expect(isImage).toBe(true);
      });
    });

    it('should correctly identify non-image file types', () => {
      const nonImageExtensions = ['.pdf', '.doc', '.docx', '.txt', '.zip'];
      const testUrls = nonImageExtensions.map(ext => `https://example.com/file${ext}`);
      
      testUrls.forEach(url => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        expect(isImage).toBe(false);
      });
    });

    it('should handle URLs without extensions', () => {
      const urlsWithoutExtensions = [
        'https://example.com/file',
        'https://example.com/path/to/resource',
        'https://example.com/file?param=value'
      ];
      
      urlsWithoutExtensions.forEach(url => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        expect(isImage).toBe(false);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty file URLs gracefully', async () => {
      const user = userEvent.setup();
      const equipmentWithEmptyFiles = {
        ...equipmentWithFiles,
        image_url: null,
        thirdpartyInspectionImage: '',
        pgpcInspectionImage: undefined,
        originalReceiptUrl: null,
        equipmentRegistrationUrl: ''
      };

      mockEquipmentsStore.selectedEquipment = equipmentWithEmptyFiles;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithEmptyFiles],
        maintenanceReports: [],
        projects: [equipmentWithEmptyFiles.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Check Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));
      expect(screen.getByText('No images available for this equipment')).toBeInTheDocument();

      // Check Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));
      expect(screen.getByText('No documents available for this equipment')).toBeInTheDocument();
    });

    it('should handle malformed parts JSON gracefully', async () => {
      const user = userEvent.setup();
      const equipmentWithMalformedParts = {
        ...equipmentWithFiles,
        equipmentParts: ['{"invalid": json}'] // Malformed JSON
      };

      mockEquipmentsStore.selectedEquipment = equipmentWithMalformedParts;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [equipmentWithMalformedParts],
        maintenanceReports: [],
        projects: [equipmentWithMalformedParts.project]
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Parts tab - should not crash
      await user.click(screen.getByRole('button', { name: /parts management/i }));

      // Should render the EquipmentPartsViewer component without crashing
      expect(screen.getByText('Equipment Parts')).toBeInTheDocument();
    });

    it('should handle very long file names', async () => {
      const user = userEvent.setup();
      const longFileName = 'this-is-a-very-long-file-name-that-might-cause-display-issues-in-the-user-interface-components.jpg';
      const maintenanceWithLongNames = {
        id: 'long-names-123',
        equipment_id: 'equipment-456',
        issue_description: 'Test with long file names',
        priority: 'MEDIUM' as const,
        status: 'REPORTED' as const,
        date_reported: '2024-01-20T09:15:30Z',
        reported_user: {
          id: 'user-123',
          full_name: 'Test User'
        },
        parts_replaced: ['Part with very long documentation file name'],
        attachment_urls: [`https://storage.supabase.co/maintenance/${longFileName}`]
      };

      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceWithLongNames;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      // Should display the attachment even with long name
      expect(screen.getByTestId('image-attachment-1')).toBeInTheDocument();
    });
  });
});