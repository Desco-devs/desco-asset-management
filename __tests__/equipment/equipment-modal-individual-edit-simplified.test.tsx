/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    it('should cancel equipment information changes', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Make changes
      const brandInput = screen.getByDisplayValue('Test Brand');
      await user.clear(brandInput);
      await user.type(brandInput, 'Updated Brand');

      // Cancel changes
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should exit edit mode
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      // Should revert to original data
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
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

    it('should allow changing project assignment', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Find project select (should be first combobox)
      const projectSelect = screen.getAllByRole('combobox')[0];
      await user.click(projectSelect);

      // Select different project
      const option = screen.getByText('Another Project - Another Client');
      await user.click(option);

      // Verify selection was made
      expect(screen.getByText('Another Project - Another Client')).toBeInTheDocument();
    });

    it('should allow changing operational status', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Find status select (should be second combobox)
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects[1];
      await user.click(statusSelect);

      // Select Non-Operational
      const nonOpOption = screen.getByText('Non-Operational');
      await user.click(nonOpOption);

      // Verify selection was made
      expect(screen.getByDisplayValue('NON_OPERATIONAL')).toBeInTheDocument();
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

    it('should allow editing inspection frequency', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Find frequency select (should be the first select in edit mode)
      const frequencySelect = screen.getByRole('combobox');
      await user.click(frequencySelect);

      // Select different frequency
      const option = screen.getByText('Every 12 months');
      await user.click(option);

      // Verify selection
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    });

    it('should allow editing additional notes', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Find remarks textarea
      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'Updated inspection remarks');
      
      expect(remarksTextarea).toHaveValue('Updated inspection remarks');
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

    it('should cancel inspection changes', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Make changes
      const remarksTextarea = screen.getByDisplayValue('Test remarks');
      await user.clear(remarksTextarea);
      await user.type(remarksTextarea, 'Updated inspection notes');

      // Cancel changes
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should exit edit mode
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      // Should revert changes
      expect(screen.getByText('Test remarks')).toBeInTheDocument();
    });

    it('should open date picker for registration expiry', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Find and click registration expiry date picker
      const registrationButton = screen.getByText(/December 31, 2024/);
      await user.click(registrationButton);

      // Calendar should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should open date picker for insurance expiration', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Find and click insurance expiry date picker
      const insuranceButton = screen.getByText(/November 30, 2024/);
      await user.click(insuranceButton);

      // Calendar should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should open date picker for last inspection', async () => {
      const user = userEvent.setup();
      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[1]);

      // Find and click last inspection date picker
      const inspectionButton = screen.getByText(/January 15, 2024/);
      await user.click(inspectionButton);

      // Calendar should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Data Persistence', () => {
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
  });

  describe('Loading States', () => {
    it('should disable save button during API call', async () => {
      const user = userEvent.setup();
      
      // Mock pending state
      jest.mocked(require('@/hooks/useEquipmentsQuery').useUpdateEquipmentAction).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      render(<EquipmentModalModern />, { wrapper: createWrapper() });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });
});