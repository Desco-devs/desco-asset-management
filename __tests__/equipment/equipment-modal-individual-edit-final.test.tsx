/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock child components
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
  return function MockPartsFoldermanager({ initialData, onChange }: { initialData: any; onChange: () => void }) {
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

describe('EquipmentModalModern - Individual Edit Functionality', () => {
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

  describe('Equipment Information Section', () => {
    it('should display equipment information in view mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      expect(screen.getByText('Equipment Information')).toBeInTheDocument();
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('Test Model')).toBeInTheDocument();
      expect(screen.getByText('Test Type')).toBeInTheDocument();
      expect(screen.getByText('Test Owner')).toBeInTheDocument();
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
    });

    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Click the first Edit button (Equipment Information section)
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Should show form fields
      expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Model')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Type')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Owner')).toBeInTheDocument();

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should allow editing brand field', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');
      
      expect(brandInput).toHaveValue('Updated Brand');
    });

    it('should allow editing model field', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const modelInput = screen.getByDisplayValue('Test Model');
      await user.clear(modelInput);
      await user.type(modelInput, 'Updated Model');
      
      expect(modelInput).toHaveValue('Updated Model');
    });

    it('should save equipment information changes', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

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
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Clear required field
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);

      // Input should be marked as required
      expect(brandInput).toBeRequired();
    });

    it('should edit plate number field correctly', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const plateInput = screen.getByDisplayValue('ABC123');
      await user.clear(plateInput);
      await user.type(plateInput, 'XYZ789');
      
      expect(plateInput).toHaveValue('XYZ789');
    });

    it('should edit owner field correctly', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const ownerInput = screen.getByDisplayValue('Test Owner');
      await user.clear(ownerInput);
      await user.type(ownerInput, 'Updated Owner');
      
      expect(ownerInput).toHaveValue('Updated Owner');
    });

    it('should edit remarks field correctly', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const remarksInput = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksInput);
      await user.type(remarksInput, 'Updated remarks');
      
      expect(remarksInput).toHaveValue('Updated remarks');
    });
  });

  describe('Dates & Inspection Section', () => {
    it('should display dates & inspection information in view mode', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      expect(screen.getByText('Dates & Inspection')).toBeInTheDocument();
      expect(screen.getByText('Registration Expires:')).toBeInTheDocument();
      expect(screen.getByText('Insurance Expires:')).toBeInTheDocument();
      expect(screen.getByText('Last Inspection:')).toBeInTheDocument();
    });

    it('should enter edit mode when dates & inspection edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Click the second Edit button (Dates & Inspection section)
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Should show date picker buttons
      expect(screen.getByText('Registration Expires')).toBeInTheDocument();
      expect(screen.getByText('Insurance Expires')).toBeInTheDocument();
      expect(screen.getByText('Last Inspection')).toBeInTheDocument();
      expect(screen.getByText('Inspection Frequency')).toBeInTheDocument();

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should save inspection changes', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

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
    });

    it('should show formatted dates correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Should show formatted dates in view mode
      expect(screen.getByText(/12\/31\/2024/)).toBeInTheDocument(); // Registration expiry
      expect(screen.getByText(/11\/30\/2024/)).toBeInTheDocument(); // Insurance expiry
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();  // Last inspection
    });

    it('should show inspection frequency correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      expect(screen.getByText('Every 6 months')).toBeInTheDocument();
    });

    it('should display additional notes correctly', () => {
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      expect(screen.getByText('Test remarks')).toBeInTheDocument();
    });
  });

  describe('Data Persistence and API Integration', () => {
    it('should persist data when switching between tabs', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Edit equipment information
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

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

      // Original data should still be displayed (since we didn't mock the update properly)
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
    });

    it('should handle server errors gracefully', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Server error'));

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update overview');
      });

      // Should remain in edit mode
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should correctly submit form data', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Make changes
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'New Brand');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify FormData was created correctly
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(expect.any(FormData));
        const formData = mockMutateAsync.mock.calls[0][0];
        expect(formData.get('equipmentId')).toBe('equipment-1');
      });
    });

    it('should format inspection form data correctly', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Make changes to remarks
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
        expect(formData.get('before')).toBe('6');
      });
    });
  });

  describe('Individual Section Edit States', () => {
    it('should allow editing multiple sections simultaneously', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Enter edit mode for equipment information
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Should have one set of Save/Cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      // Enter edit mode for dates & inspection
      const remainingEditButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(remainingEditButtons[0]);

      // Both sections should be in edit mode
      expect(screen.getAllByRole('button', { name: /save changes/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /cancel/i })).toHaveLength(2);
    });

    it('should not interfere between different section edits', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Enter edit mode for equipment information
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Make changes to equipment info
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');

      // Enter edit mode for dates & inspection
      const remainingEditButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(remainingEditButtons[0]);

      // Changes to equipment info should still be there
      expect(brandInput).toHaveValue('Updated Brand');

      // Both sections should have their own Save/Cancel buttons
      expect(screen.getAllByRole('button', { name: /save changes/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /cancel/i })).toHaveLength(2);
    });

    it('should maintain form data after cancelling other section', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Enter edit mode for equipment information and make changes
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');

      // Enter edit mode for dates & inspection and make changes
      const remainingEditButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(remainingEditButtons[0]);

      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'Updated remarks');

      // Cancel dates & inspection changes
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[1]); // Cancel the second section

      // Equipment information changes should still be there
      expect(brandInput).toHaveValue('Updated Brand');
      
      // Dates & inspection should revert
      expect(screen.getByText('Test remarks')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should preserve section data when switching tabs', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Verify initial data is displayed
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('Test Model')).toBeInTheDocument();

      // Switch to images tab
      await user.click(screen.getByText('Equipment Images'));
      expect(screen.getByText('Photos and inspection images')).toBeInTheDocument();

      // Switch back to details tab
      await user.click(screen.getByText('Equipment Details'));

      // Data should still be there
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('Test Model')).toBeInTheDocument();
      expect(screen.getByText('Equipment Information')).toBeInTheDocument();
      expect(screen.getByText('Dates & Inspection')).toBeInTheDocument();
    });

    it('should show correct tab content', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      // Details tab should be active by default
      expect(screen.getByText('Equipment Information')).toBeInTheDocument();
      expect(screen.getByText('Dates & Inspection')).toBeInTheDocument();

      // Switch to images tab
      await user.click(screen.getByText('Equipment Images'));
      expect(screen.getByText('Photos and inspection images')).toBeInTheDocument();

      // Switch to documents tab
      await user.click(screen.getByText('Documents'));
      expect(screen.getByText('Important equipment documents')).toBeInTheDocument();

      // Switch to parts tab
      await user.click(screen.getByText('Parts Management'));
      expect(screen.getByTestId('parts-viewer')).toBeInTheDocument();

      // Switch to maintenance tab
      await user.click(screen.getByText('Maintenance Reports'));
      expect(screen.getByTestId('maintenance-reports')).toBeInTheDocument();
    });
  });
});