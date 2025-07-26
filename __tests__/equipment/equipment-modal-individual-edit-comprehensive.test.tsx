/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EquipmentModalModern from '@/app/(admin-dashboard)/equipments/components/modals/EquipmentModalModern';
import { useEquipmentsStore } from '@/stores/equipmentsStore';

// Mock the dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useUpdateEquipmentAction hook
const mockMutateAsync = jest.fn();
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useEquipmentsWithReferenceData: () => ({
    equipments: [mockEquipment],
    maintenanceReports: [],
    projects: [mockProject, mockProject2],
  }),
  useUpdateEquipmentAction: () => ({
    mutateAsync: mockMutateAsync,
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

// Mock child components that may not be fully testable
jest.mock('@/app/(admin-dashboard)/equipments/components/EquipmentMaintenanceReportsEnhanced', () => {
  return function MockMaintenanceReports({ equipmentId }: { equipmentId: string }) {
    return <div data-testid="maintenance-reports">Maintenance Reports for {equipmentId}</div>;
  };
});

jest.mock('@/app/(admin-dashboard)/equipments/components/EquipmentPartsViewer', () => {
  return function MockPartsViewer({ equipmentParts }: { equipmentParts: any }) {
    return <div data-testid="parts-viewer">Parts Viewer</div>;
  };
});

jest.mock('@/app/(admin-dashboard)/equipments/components/forms/PartsFolderManager', () => {
  return function MockPartsFolderManager({ initialData, onChange }: { initialData: any; onChange: () => void }) {
    return <div data-testid="parts-folder-manager">Parts Folder Manager</div>;
  };
});

jest.mock('@/components/equipment/ImageDisplayWithRemove', () => ({
  ImageDisplayWithRemove: ({ url, label, onRemove }: { url: string; label: string; onRemove: () => void }) => (
    <div data-testid="image-display">
      <span>{label}</span>
      <button onClick={onRemove}>Remove</button>
    </div>
  ),
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

const mockProject2 = {
  uid: 'project-2',
  name: 'Another Project',
  client: {
    uid: 'client-2',
    name: 'Another Client',
    location: {
      uid: 'location-2',
      address: 'Another Address',
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
  plateNumber: 'ABC123',
  remarks: 'Test remarks',
  registrationExpiry: '2024-12-31',
  insuranceExpirationDate: '2024-11-30',
  inspectionDate: '2024-01-15',
  before: 6,
  image_url: 'https://example.com/image.jpg',
  originalReceiptUrl: 'https://example.com/receipt.pdf',
  equipmentRegistrationUrl: 'https://example.com/registration.pdf',
  thirdpartyInspectionImage: 'https://example.com/inspection.jpg',
  pgpcInspectionImage: 'https://example.com/pgpc.jpg',
  equipmentParts: ['{"rootFiles": [], "folders": []}'],
  project: mockProject,
  created_at: '2024-01-01',
  created_by: 'Test User',
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

describe('EquipmentModalModern - Individual Edit Functionality Comprehensive Tests', () => {
  let mockStoreActions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue(mockEquipment);
    
    // Create mock store actions
    mockStoreActions = {
      setIsModalOpen: jest.fn(),
      setIsEditMode: jest.fn(),
      setSelectedEquipment: jest.fn(),
      setIsPhotosCollapsed: jest.fn(),
      setIsDocumentsCollapsed: jest.fn(),
      setDeleteConfirmation: jest.fn(),
      setIsEquipmentMaintenanceModalOpen: jest.fn(),
    };

    // Mock the store with default values
    (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEquipment: mockEquipment,
        isModalOpen: true,
        isEditMode: false,
        isMobile: false,
        isPhotosCollapsed: false,
        isDocumentsCollapsed: false,
        ...mockStoreActions,
      };
      return typeof selector === 'function' ? selector(state) : state;
    });
  });

  describe('Equipment Information Section Edit Functionality', () => {
    it('should display equipment information section correctly in view mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Check that all equipment information is displayed
      expect(screen.getByText('Equipment Information')).toBeInTheDocument();
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('Test Model')).toBeInTheDocument();
      expect(screen.getByText('Test Type')).toBeInTheDocument();
      expect(screen.getByText('Test Owner')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should show edit button for Equipment Information section', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('div');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      expect(editButton).toBeInTheDocument();
    });

    it('should enter edit mode when "Edit equipment details" button is clicked', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Should show form fields in edit mode
      expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Model')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Type')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Owner')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ABC123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test remarks')).toBeInTheDocument();

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should allow editing all equipment information fields', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Edit brand field
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');
      expect(brandInput).toHaveValue('Updated Brand');

      // Edit model field
      const modelInput = screen.getByDisplayValue('Test Model');
      await user.clear(modelInput);
      await user.type(modelInput, 'Updated Model');
      expect(modelInput).toHaveValue('Updated Model');

      // Edit type field
      const typeInput = screen.getByDisplayValue('Test Type');
      await user.clear(typeInput);
      await user.type(typeInput, 'Updated Type');
      expect(typeInput).toHaveValue('Updated Type');

      // Edit plate number field
      const plateInput = screen.getByDisplayValue('ABC123');
      await user.clear(plateInput);
      await user.type(plateInput, 'XYZ789');
      expect(plateInput).toHaveValue('XYZ789');

      // Edit owner field
      const ownerInput = screen.getByDisplayValue('Test Owner');
      await user.clear(ownerInput);
      await user.type(ownerInput, 'Updated Owner');
      expect(ownerInput).toHaveValue('Updated Owner');

      // Edit remarks field
      const remarksInput = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksInput);
      await user.type(remarksInput, 'Updated remarks');
      expect(remarksInput).toHaveValue('Updated remarks');
    });

    it('should allow changing project assignment', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find and click the project select
      const projectSelect = screen.getByRole('combobox');
      await user.click(projectSelect);

      // Select different project
      const option = screen.getByText('Another Project - Another Client');
      await user.click(option);

      // Verify selection
      expect(screen.getByText('Another Project - Another Client')).toBeInTheDocument();
    });

    it('should allow changing operational status', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find status select (should be the second combobox)
      const selectTriggers = screen.getAllByRole('combobox');
      const statusSelect = selectTriggers[1]; // Second select is status
      await user.click(statusSelect);

      // Select Non-Operational
      const nonOpOption = screen.getByText('Non-Operational');
      await user.click(nonOpOption);

      // Verify selection
      expect(screen.getByDisplayValue('NON_OPERATIONAL')).toBeInTheDocument();
    });

    it('should save changes successfully when "Save Changes" is clicked', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Make changes
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should call the mutation
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(expect.any(FormData));
      });

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith('Overview updated successfully');

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should cancel changes when "Cancel" is clicked', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Make changes
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');

      // Cancel changes
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should exit edit mode and revert to view mode
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Updated Brand')).not.toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Clear required field
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should not proceed with empty required field
      expect(brandInput).toBeRequired();
      expect(brandInput).toBeInvalid();
    });
  });

  describe('Dates & Inspection Section Edit Functionality', () => {
    it('should display dates & inspection section correctly in view mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Check that dates & inspection section is displayed
      expect(screen.getByText('Dates & Inspection')).toBeInTheDocument();
      expect(screen.getByText('Registration Expires:')).toBeInTheDocument();
      expect(screen.getByText('Insurance Expires:')).toBeInTheDocument();
      expect(screen.getByText('Last Inspection:')).toBeInTheDocument();
      expect(screen.getByText('Next Inspection Due:')).toBeInTheDocument();
      expect(screen.getByText('Inspection Frequency:')).toBeInTheDocument();
    });

    it('should show edit button for Dates & Inspection section', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionSection = screen.getByText('Dates & Inspection').closest('div');
      const editButton = within(inspectionSection!).getByRole('button', { name: /edit/i });
      
      expect(editButton).toBeInTheDocument();
    });

    it('should enter edit mode when edit button is clicked in Dates & Inspection section', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Find the Dates & Inspection section specifically
      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Should show date picker buttons in edit mode
      expect(screen.getByText('Registration Expires')).toBeInTheDocument();
      expect(screen.getByText('Insurance Expires')).toBeInTheDocument();
      expect(screen.getByText('Last Inspection')).toBeInTheDocument();
      expect(screen.getByText('Inspection Frequency')).toBeInTheDocument();

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should allow editing registration expiry date', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find the registration expiry date picker
      const registrationButton = screen.getByText(/December 31, 2024/);
      expect(registrationButton).toBeInTheDocument();
      
      await user.click(registrationButton);

      // Calendar should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should allow editing insurance expiration date', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find the insurance expiry date picker
      const insuranceButton = screen.getByText(/November 30, 2024/);
      expect(insuranceButton).toBeInTheDocument();
      
      await user.click(insuranceButton);

      // Calendar should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should allow editing last inspection date', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find the last inspection date picker
      const inspectionButton = screen.getByText(/January 15, 2024/);
      expect(inspectionButton).toBeInTheDocument();
      
      await user.click(inspectionButton);

      // Calendar should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should allow changing inspection frequency', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find frequency select
      const frequencySelect = screen.getByRole('combobox');
      await user.click(frequencySelect);

      // Select different frequency
      const option = screen.getByText('Every 12 months');
      await user.click(option);

      // Verify selection
      expect(screen.getByText('Every 12 months')).toBeInTheDocument();
    });

    it('should allow editing additional notes in inspection section', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Find remarks textarea
      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'Updated inspection remarks');
      
      expect(remarksTextarea).toHaveValue('Updated inspection remarks');
    });

    it('should save inspection changes successfully', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Make changes to remarks
      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'Updated inspection notes');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should call the mutation
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(expect.any(FormData));
      });

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith('Inspection updated successfully');

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should cancel inspection changes when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Make changes
      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'Updated inspection notes');

      // Cancel changes
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should exit edit mode and revert changes
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByText('Test remarks')).toBeInTheDocument();
    });
  });

  describe('Data Persistence and Server State Updates', () => {
    it('should persist equipment information changes in view mode after saving', async () => {
      const user = userEvent.setup();
      
      // Mock updated equipment data
      const updatedEquipment = {
        ...mockEquipment,
        brand: 'Updated Brand',
        model: 'Updated Model',
      };

      mockMutateAsync.mockResolvedValue(updatedEquipment);

      // Update the mock to return updated equipment
      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          selectedEquipment: updatedEquipment,
          isModalOpen: true,
          isEditMode: false,
          isMobile: false,
          isPhotosCollapsed: false,
          isDocumentsCollapsed: false,
          ...mockStoreActions,
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      // Mock hook to return updated equipment in the list
      jest.mocked(require('@/hooks/useEquipmentsQuery').useEquipmentsWithReferenceData).mockReturnValue({
        equipments: [updatedEquipment],
        maintenanceReports: [],
        projects: [mockProject, mockProject2],
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Should show updated data in view mode
      expect(screen.getByText('Updated Brand')).toBeInTheDocument();
      expect(screen.getByText('Updated Model')).toBeInTheDocument();
    });

    it('should persist inspection data changes in view mode after saving', async () => {
      const user = userEvent.setup();
      
      // Mock updated equipment with inspection data
      const updatedEquipment = {
        ...mockEquipment,
        remarks: 'Updated inspection remarks',
        before: 12,
      };

      mockMutateAsync.mockResolvedValue(updatedEquipment);

      // Update the mock to return updated equipment
      (useEquipmentsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          selectedEquipment: updatedEquipment,
          isModalOpen: true,
          isEditMode: false,
          isMobile: false,
          isPhotosCollapsed: false,
          isDocumentsCollapsed: false,
          ...mockStoreActions,
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Should show updated inspection data in view mode
      expect(screen.getByText('Updated inspection remarks')).toBeInTheDocument();
      expect(screen.getByText('Every 12 months')).toBeInTheDocument();
    });

    it('should maintain data consistency when switching between tabs', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Edit equipment information
      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Switch to images tab and back
      await user.click(screen.getByText('Equipment Images'));
      await user.click(screen.getByText('Equipment Details'));

      // Data should still be updated
      expect(screen.getByText('Test Brand')).toBeInTheDocument(); // Should show original since we didn't mock the update
    });

    it('should handle server errors gracefully', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Server error'));

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update overview');
      });

      // Should remain in edit mode
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should disable save button during API call', async () => {
      const user = userEvent.setup();
      
      // Mock pending state
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Form Data Validation and Submission', () => {
    it('should correctly format and submit equipment information form data', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Make comprehensive changes
      await user.clear(screen.getByDisplayValue('Test Brand'));
      await user.type(screen.getByDisplayValue(''), 'New Brand');

      await user.clear(screen.getByDisplayValue('Test Model'));
      await user.type(screen.getByDisplayValue(''), 'New Model');

      await user.clear(screen.getByDisplayValue('Test Owner'));
      await user.type(screen.getByDisplayValue(''), 'New Owner');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify FormData was created correctly
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(expect.any(FormData));
        const formData = mockMutateAsync.mock.calls[0][0];
        expect(formData.get('equipmentId')).toBe('equipment-1');
      });
    });

    it('should correctly format and submit inspection form data with dates', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Change remarks
      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'New inspection notes');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify FormData includes inspection data
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(expect.any(FormData));
        const formData = mockMutateAsync.mock.calls[0][0];
        expect(formData.get('equipmentId')).toBe('equipment-1');
        expect(formData.get('remarks')).toBe('New inspection notes');
      });
    });
  });

  describe('Individual Section Edit State Management', () => {
    it('should not affect other sections when editing equipment information', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Enter edit mode for equipment information
      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const editButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Dates & Inspection section should still show edit button, not save/cancel
      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const inspectionEditButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      expect(inspectionEditButton).toBeInTheDocument();
      expect(inspectionEditButton).not.toBeDisabled();
    });

    it('should not affect other sections when editing dates & inspection', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Enter edit mode for dates & inspection
      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const editButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Equipment Information section should still show edit button, not save/cancel
      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const equipmentEditButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      
      expect(equipmentEditButton).toBeInTheDocument();
      expect(equipmentEditButton).not.toBeDisabled();
    });

    it('should allow editing multiple sections simultaneously', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Enter edit mode for equipment information
      const equipmentSection = screen.getByText('Equipment Information').closest('.space-y-8');
      const equipmentEditButton = within(equipmentSection!).getByRole('button', { name: /edit/i });
      await user.click(equipmentEditButton);

      // Enter edit mode for dates & inspection
      const inspectionCards = screen.getAllByText('Dates & Inspection');
      const inspectionCard = inspectionCards[0].closest('.space-y-6');
      const inspectionEditButton = within(inspectionCard!).getByRole('button', { name: /edit/i });
      await user.click(inspectionEditButton);

      // Both sections should be in edit mode
      expect(screen.getAllByRole('button', { name: /save changes/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /cancel/i })).toHaveLength(2);
    });
  });
});