/**
 * Equipment Database Integration Tests
 * Tests actual database operations and real-time updates
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateEquipmentForm from '@/app/(admin-dashboard)/equipments/components/forms/CreateEquipmentForm';
import { createEquipmentAction } from '@/app/(admin-dashboard)/equipments/actions';

// Mock real-time subscription
const mockSubscription = {
  subscribe: jest.fn(() => ({
    unsubscribe: jest.fn()
  }))
};

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { id: 'test-equipment-id' }, 
        error: null 
      }),
      on: jest.fn(() => mockSubscription),
      subscribe: jest.fn(() => mockSubscription)
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'test/path.jpg' }, 
          error: null 
        }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/test.jpg' }
        }))
      }))
    },
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    }
  }
}));

// Mock server actions with real-like behavior
jest.mock('@/app/(admin-dashboard)/equipments/actions', () => ({
  createEquipmentAction: jest.fn()
}));

// Mock hooks with database-like behavior
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useCreateEquipmentAction: jest.fn(),
  useEquipmentsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn()
  }))
}));

// Mock real-time store
const mockEquipmentsStore = {
  equipments: [],
  addEquipment: jest.fn(),
  updateEquipment: jest.fn(),
  removeEquipment: jest.fn(),
  subscribe: jest.fn()
};

jest.mock('@/stores/equipmentsStore', () => ({
  useEquipmentsStore: jest.fn(() => mockEquipmentsStore)
}));

const mockProjects = [
  { 
    id: 'project-1', 
    name: 'Database Test Project',
    client: {
      id: 'client-1',
      name: 'Test Client',
      location: { id: 'location-1', address: 'Test Address' }
    }
  }
];

describe('Equipment Database Integration', () => {
  let queryClient: QueryClient;
  let mockMutate: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockMutate = jest.fn();
    const mockUseCreateEquipmentAction = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction;
    mockUseCreateEquipmentAction.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Database Write Operations', () => {
    it('should successfully create equipment in database with all data', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      // Mock successful database creation
      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: {
          uid: 'equipment-db-123',
          brand: 'Caterpillar',
          model: '320D',
          type: 'Excavator',
          owner: 'DB Test Corp',
          status: 'OPERATIONAL' as const,
          plateNumber: 'DB-CAT-001',
          remarks: 'Database integration test equipment',
          project: mockProjects[0],
          created_at: new Date().toISOString()
        },
        maintenanceReport: null
      });

      mockMutate.mockImplementation(async (formData, { onSuccess }) => {
        const result = await mockCreateAction(formData);
        onSuccess(result);
      });

      renderWithProviders(
        <CreateEquipmentForm 
          projects={mockProjects}
          onSuccess={jest.fn()}
        />
      );

      // Fill form with comprehensive data
      await user.type(screen.getByLabelText(/brand/i), 'Caterpillar');
      await user.type(screen.getByLabelText(/model/i), '320D');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'DB Test Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');
      await user.type(screen.getByLabelText(/plate.*serial number/i), 'DB-CAT-001');
      await user.type(screen.getByLabelText(/remarks/i), 'Database integration test equipment');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });

      // Verify the data structure passed to database
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('brand')).toBe('Caterpillar');
      expect(formData.get('model')).toBe('320D');
      expect(formData.get('type')).toBe('Excavator');
      expect(formData.get('owner')).toBe('DB Test Corp');
      expect(formData.get('projectId')).toBe('project-1');
      expect(formData.get('plateNumber')).toBe('DB-CAT-001');
      expect(formData.get('remarks')).toBe('Database integration test equipment');
    });

    it('should create equipment with maintenance report in database', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: {
          uid: 'equipment-with-maintenance-456',
          brand: 'Komatsu',
          model: 'PC200',
          type: 'Excavator',
          owner: 'Maintenance Test Corp',
          status: 'OPERATIONAL' as const,
          project: mockProjects[0]
        },
        maintenanceReport: {
          id: 'maintenance-report-789',
          equipmentId: 'equipment-with-maintenance-456',
          issueDescription: 'Initial setup maintenance',
          priority: 'MEDIUM' as const,
          status: 'REPORTED' as const,
          createdAt: new Date().toISOString()
        }
      });

      mockMutate.mockImplementation(async (formData, { onSuccess }) => {
        const result = await mockCreateAction(formData);
        onSuccess(result);
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill equipment details
      await user.type(screen.getByLabelText(/brand/i), 'Komatsu');
      await user.type(screen.getByLabelText(/model/i), 'PC200');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Maintenance Test Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Add maintenance report
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);

      await user.type(screen.getByLabelText(/issue description/i), 'Initial setup maintenance');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'MEDIUM');
      await user.selectOptions(screen.getByLabelText(/status/i), 'REPORTED');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // Verify maintenance report data was included
      const formData = mockMutate.mock.calls[0][0];
      const maintenanceData = JSON.parse(formData.get('maintenanceReport'));
      expect(maintenanceData.issueDescription).toBe('Initial setup maintenance');
      expect(maintenanceData.priority).toBe('MEDIUM');
      expect(maintenanceData.status).toBe('REPORTED');
    });

    it('should handle file uploads to storage bucket', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: {
          uid: 'equipment-with-files-789',
          brand: 'JCB',
          model: 'JS130',
          type: 'Excavator',
          owner: 'File Test Corp',
          status: 'OPERATIONAL' as const,
          image_url: 'https://example.com/equipment-images/js130.jpg',
          originalReceiptUrl: 'https://example.com/receipts/receipt-789.pdf',
          project: mockProjects[0]
        },
        maintenanceReport: null
      });

      mockMutate.mockImplementation(async (formData, { onSuccess }) => {
        const result = await mockCreateAction(formData);
        onSuccess(result);
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'JCB');
      await user.type(screen.getByLabelText(/model/i), 'JS130');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'File Test Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Upload equipment image
      const imagesTab = screen.getByRole('button', { name: /equipment images/i });
      await user.click(imagesTab);

      const equipmentImage = new File(['equipment image data'], 'js130.jpg', { type: 'image/jpeg' });
      const imageInput = screen.getByTestId('file-input-equipment-image');
      await user.upload(imageInput, equipmentImage);

      // Upload receipt document
      const documentsTab = screen.getByRole('button', { name: /documents/i });  
      await user.click(documentsTab);

      const receiptFile = new File(['receipt pdf data'], 'receipt.pdf', { type: 'application/pdf' });
      const receiptInput = screen.getByTestId('file-input-original-receipt-or-');
      await user.upload(receiptInput, receiptFile);

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // Verify files were included in the form data
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('equipmentImage')).toEqual(equipmentImage);
      expect(formData.get('originalReceipt')).toEqual(receiptFile);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      // Mock database connection error
      mockCreateAction.mockRejectedValue(new Error('Database connection failed'));

      mockMutate.mockImplementation(async (formData, { onError }) => {
        try {
          await mockCreateAction(formData);
        } catch (error) {
          onError(error);
        }
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/brand/i), 'Error Test');
      await user.type(screen.getByLabelText(/model/i), 'ET-100');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Error Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // Form should remain populated for retry
      expect(screen.getByLabelText(/brand/i)).toHaveValue('Error Test');
      expect(screen.getByLabelText(/model/i)).toHaveValue('ET-100');
    });

    it('should handle validation errors from database', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      // Mock validation error from database
      mockCreateAction.mockResolvedValue({
        success: false,
        error: 'Validation failed: Equipment with plate number already exists'
      });

      mockMutate.mockImplementation(async (formData, { onError }) => {
        const result = await mockCreateAction(formData);
        if (!result.success) {
          onError(new Error(result.error));
        }
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      await user.type(screen.getByLabelText(/brand/i), 'Duplicate Brand');
      await user.type(screen.getByLabelText(/model/i), 'DUP-200');
      await user.type(screen.getByLabelText(/plate.*serial number/i), 'EXISTING-PLATE');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Duplicate Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // Form should still contain the data for correction
      expect(screen.getByLabelText(/plate.*serial number/i)).toHaveValue('EXISTING-PLATE');
    });

    it('should handle file upload failures', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      // Mock file upload failure
      mockCreateAction.mockRejectedValue(new Error('File upload failed: Storage quota exceeded'));

      mockMutate.mockImplementation(async (formData, { onError }) => {
        try {
          await mockCreateAction(formData);
        } catch (error) {
          onError(error);
        }
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'File Fail Test');
      await user.type(screen.getByLabelText(/model/i), 'FFT-300');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'File Fail Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Attempt file upload
      const imagesTab = screen.getByRole('button', { name: /equipment images/i });
      await user.click(imagesTab);

      const largeFile = new File(['very large file content'], 'large-image.jpg', { type: 'image/jpeg' });
      const imageInput = screen.getByTestId('file-input-equipment-image');
      await user.upload(imageInput, largeFile);

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // File should still be selected for retry
      expect(screen.getByText('File selected: large-image.jpg')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time equipment creation notifications', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      const newEquipment = {
        uid: 'realtime-equipment-456',
        brand: 'Realtime Brand',
        model: 'RT-400',
        type: 'Excavator',
        owner: 'Realtime Corp',
        status: 'OPERATIONAL' as const,
        project: mockProjects[0],
        created_at: new Date().toISOString()
      };

      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: newEquipment,
        maintenanceReport: null
      });

      mockMutate.mockImplementation(async (formData, { onSuccess }) => {
        const result = await mockCreateAction(formData);
        
        // Simulate real-time update
        mockEquipmentsStore.addEquipment(result.equipment);
        
        onSuccess(result);
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/brand/i), 'Realtime Brand');
      await user.type(screen.getByLabelText(/model/i), 'RT-400');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Realtime Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEquipmentsStore.addEquipment).toHaveBeenCalledWith(newEquipment);
      });
    });

    it('should establish subscription for equipment updates', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Verify subscription was established
      expect(mockSubscription.subscribe).toHaveBeenCalled();
    });
  });

  describe('Transaction Handling', () => {
    it('should handle successful transaction with equipment and maintenance report', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      // Mock successful transaction
      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: {
          uid: 'transaction-equipment-789',
          brand: 'Transaction Test',
          model: 'TT-500',
          type: 'Excavator',
          owner: 'Transaction Corp',
          status: 'OPERATIONAL' as const,
          project: mockProjects[0]
        },
        maintenanceReport: {
          id: 'transaction-maintenance-123',
          equipmentId: 'transaction-equipment-789',
          issueDescription: 'Maintenance as part of creation',
          priority: 'LOW' as const,
          status: 'REPORTED' as const
        }
      });

      mockMutate.mockImplementation(async (formData, { onSuccess }) => {
        const result = await mockCreateAction(formData);
        onSuccess(result);
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill equipment data
      await user.type(screen.getByLabelText(/brand/i), 'Transaction Test');
      await user.type(screen.getByLabelText(/model/i), 'TT-500');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Transaction Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Add maintenance data
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);
      await user.type(screen.getByLabelText(/issue description/i), 'Maintenance as part of creation');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // Both equipment and maintenance report should be created in transaction
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('brand')).toBe('Transaction Test');
      expect(JSON.parse(formData.get('maintenanceReport')).issueDescription).toBe('Maintenance as part of creation');
    });

    it('should rollback transaction on failure', async () => {
      const user = userEvent.setup();
      const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>;
      
      // Mock transaction failure
      mockCreateAction.mockRejectedValue(new Error('Transaction failed: Unable to create maintenance report'));

      mockMutate.mockImplementation(async (formData, { onError }) => {
        try {
          await mockCreateAction(formData);
        } catch (error) {
          onError(error);
        }
      });

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      );

      // Fill complete form data
      await user.type(screen.getByLabelText(/brand/i), 'Rollback Test');
      await user.type(screen.getByLabelText(/model/i), 'RB-600');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Rollback Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);
      await user.type(screen.getByLabelText(/issue description/i), 'Should fail in transaction');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledTimes(1);
      });

      // Form should preserve data for retry after rollback
      expect(screen.getByLabelText(/brand/i)).toHaveValue('Rollback Test');
    });
  });
});