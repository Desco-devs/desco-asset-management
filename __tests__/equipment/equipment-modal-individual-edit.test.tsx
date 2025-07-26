/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import EquipmentModalModern from '@/app/(admin-dashboard)/equipments/components/modals/EquipmentModalModern';
import { useEquipmentsStore } from '@/stores/equipmentsStore';

// Mock the dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useEquipmentsWithReferenceData: () => ({
    equipments: [mockEquipment],
    maintenanceReports: [],
    projects: [mockProject],
  }),
  useUpdateEquipmentAction: () => ({
    mutateAsync: jest.fn().mockResolvedValue(mockEquipment),
    isPending: false,
  }),
  useDeleteEquipment: () => ({
    isPending: false,
  }),
}));

jest.mock('@/stores/equipmentsStore', () => ({
  useEquipmentsStore: jest.fn(),
  selectSelectedEquipment: (state: any) => state.selectedEquipment,
  selectIsModalOpen: (state: any) => state.isModalOpen,
  selectIsEditMode: (state: any) => state.isEditMode,
  selectIsMobile: (state: any) => state.isMobile,
  selectIsPhotosCollapsed: (state: any) => state.isPhotosCollapsed,
  selectIsDocumentsCollapsed: (state: any) => state.isDocumentsCollapsed,
}));

// Mock data
const mockProject = {
  uid: 'project-1',
  name: 'Test Project',
  client: {
    uid: 'client-1',
    name: 'Test Client',
    location: {
      uid: 'location-1',
      address: 'Test Address',
    },
  },
};

const mockEquipment = {
  uid: 'equipment-1',
  brand: 'Test Brand',
  model: 'Test Model',
  type: 'Test Type',
  owner: 'Test Owner',
  status: 'OPERATIONAL' as const,
  insuranceExpirationDate: '2024-12-31',
  inspectionDate: '2024-01-01',
  plateNumber: 'ABC123',
  remarks: 'Test remarks',
  before: 12,
  image_url: 'https://example.com/image.jpg',
  originalReceiptUrl: 'https://example.com/receipt.pdf',
  equipmentRegistrationUrl: 'https://example.com/registration.pdf',
  thirdpartyInspectionImage: 'https://example.com/inspection.jpg',
  pgpcInspectionImage: 'https://example.com/pgpc.jpg',
  equipmentParts: ['{"rootFiles": [], "folders": []}'],
  project: mockProject,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('EquipmentModalModern - Individual Tab Edit Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the store with default values
    (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEquipment: mockEquipment,
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
      return typeof selector === 'function' ? selector(state) : state;
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tabs correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      expect(screen.getByText('Equipment Details')).toBeInTheDocument();
      expect(screen.getByText('Equipment Images')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Parts Management')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Reports')).toBeInTheDocument();
    });

    it('should switch between tabs correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Click on Images tab
      fireEvent.click(screen.getByText('Equipment Images'));
      expect(screen.getByText('Photos and inspection images')).toBeInTheDocument();

      // Click on Documents tab
      fireEvent.click(screen.getByText('Documents'));
      expect(screen.getByText('Important equipment documents')).toBeInTheDocument();

      // Click on Parts tab
      fireEvent.click(screen.getByText('Parts Management'));
      expect(screen.getByText('View and browse parts documentation')).toBeInTheDocument();
    });

    it('should show correct counts in tab badges', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Should show count badges for tabs with data
      const imagesTab = screen.getByText('Equipment Images').closest('button');
      const documentsTab = screen.getByText('Documents').closest('button');
      
      expect(imagesTab).toContainElement(screen.getByText('3')); // image + 2 inspections
      expect(documentsTab).toContainElement(screen.getByText('2')); // receipt + registration
    });
  });

  describe('Overview Tab Edit Functionality', () => {
    it('should show edit button in overview tab', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should enter edit mode when edit button is clicked', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show form fields in edit mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Check for form fields
      expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Model')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Type')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Owner')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ABC123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test remarks')).toBeInTheDocument();
    });

    it('should validate required fields', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Clear required field
      const brandInput = screen.getByDisplayValue('Test Brand');
      fireEvent.change(brandInput, { target: { value: '' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should not proceed with empty required field
      expect(brandInput).toBeRequired();
    });

    it('should cancel edit mode correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Make changes
      const brandInput = screen.getByDisplayValue('Test Brand');
      fireEvent.change(brandInput, { target: { value: 'Modified Brand' } });

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should exit edit mode and revert changes
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
    });
  });

  describe('Images Tab Edit Functionality', () => {
    it('should show edit button in images tab', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to images tab
      fireEvent.click(screen.getByText('Equipment Images'));
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should show file upload components in edit mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to images tab and enter edit mode
      fireEvent.click(screen.getByText('Equipment Images'));
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should show file upload sections
      expect(screen.getByText('Equipment Image')).toBeInTheDocument();
      expect(screen.getByText('Third-party Inspection')).toBeInTheDocument();
      expect(screen.getByText('PGPC Inspection')).toBeInTheDocument();
    });

    it('should handle image removal correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to images tab and enter edit mode
      fireEvent.click(screen.getByText('Equipment Images'));
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should have remove buttons for existing images
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Documents Tab Edit Functionality', () => {
    it('should show edit button in documents tab', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to documents tab
      fireEvent.click(screen.getByText('Documents'));
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should show file upload components in edit mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to documents tab and enter edit mode
      fireEvent.click(screen.getByText('Documents'));
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should show file upload sections
      expect(screen.getByText('Original Receipt (OR)')).toBeInTheDocument();
      expect(screen.getByText('Equipment Registration')).toBeInTheDocument();
    });

    it('should accept PDF files for documents', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to documents tab and enter edit mode
      fireEvent.click(screen.getByText('Documents'));
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Check file inputs accept PDF and images
      const fileInputs = screen.getAllByDisplayValue('');
      fileInputs.forEach(input => {
        if (input instanceof HTMLInputElement && input.type === 'file') {
          expect(input.accept).toContain('pdf');
        }
      });
    });
  });

  describe('Parts Tab Edit Functionality', () => {
    it('should show edit button in parts tab', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to parts tab
      fireEvent.click(screen.getByText('Parts Management'));
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should show parts folder manager in edit mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Switch to parts tab and enter edit mode
      fireEvent.click(screen.getByText('Parts Management'));
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should show folder management interface
      expect(screen.getByText('Manage parts documentation with folders')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should call correct API endpoint for overview updates', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue(mockEquipment);
      
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Make changes and save
      const brandInput = screen.getByDisplayValue('Test Brand');
      fireEvent.change(brandInput, { target: { value: 'Updated Brand' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('API Error'));
      
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should show loading state during API calls', async () => {
      const mockMutateAsync = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should show loading state on save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('User Experience', () => {
    it('should show success message on successful save', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue(mockEquipment);
      
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Overview updated successfully');
      });
    });

    it('should exit edit mode after successful save', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue(mockEquipment);
      
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should preserve form data when switching between view and edit modes', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Verify form has current data
      expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Model')).toBeInTheDocument();

      // Cancel and re-enter edit mode
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      // Data should still be there
      expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Model')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing equipment data gracefully', () => {
      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
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
        return typeof selector === 'function' ? selector(state) : state;
      });

      const { container } = render(<EquipmentModalModern />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeNull();
    });

    it('should handle empty image URLs correctly', () => {
      const equipmentWithoutImages = {
        ...mockEquipment,
        image_url: undefined,
        originalReceiptUrl: undefined,
        equipmentRegistrationUrl: undefined,
        thirdpartyInspectionImage: undefined,
        pgpcInspectionImage: undefined,
      };

      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          selectedEquipment: equipmentWithoutImages,
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
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Switch to images tab
      fireEvent.click(screen.getByText('Equipment Images'));
      expect(screen.getByText('No images available for this equipment')).toBeInTheDocument();

      // Switch to documents tab
      fireEvent.click(screen.getByText('Documents'));
      expect(screen.getByText('No documents available for this equipment')).toBeInTheDocument();
    });

    it('should handle corrupted parts data gracefully', () => {
      const equipmentWithCorruptedParts = {
        ...mockEquipment,
        equipmentParts: ['invalid json'],
      };

      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          selectedEquipment: equipmentWithCorruptedParts,
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
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Switch to parts tab - should not crash
      fireEvent.click(screen.getByText('Parts Management'));
      expect(screen.getByText('View and browse parts documentation')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render drawer on mobile', () => {
      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          selectedEquipment: mockEquipment,
          isModalOpen: true,
          isEditMode: false,
          isMobile: true,
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
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Should render mobile drawer content
      expect(screen.getByText('View equipment details and maintenance records')).toBeInTheDocument();
    });

    it('should show compact tab layout on mobile', () => {
      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          selectedEquipment: mockEquipment,
          isModalOpen: true,
          isEditMode: false,
          isMobile: true,
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
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Should show only icons on mobile tabs
      const detailsTab = screen.getByRole('button', { name: /details/i });
      const imagesTab = screen.getByRole('button', { name: /images/i });
      
      expect(detailsTab).toBeInTheDocument();
      expect(imagesTab).toBeInTheDocument();
    });
  });
});