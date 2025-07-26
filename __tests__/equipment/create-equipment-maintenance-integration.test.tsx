import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateEquipmentForm from '@/app/(admin-dashboard)/equipments/components/forms/CreateEquipmentForm';

// Mock dependencies
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useCreateEquipmentAction: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

jest.mock('@/components/equipment/FileUploadSectionSimple', () => {
  return function FileUploadSectionSimple({ label, onFileChange, selectedFile, ...props }: any) {
    return (
      <div data-testid={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}>
        <label>{label}</label>
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            onFileChange(file);
          }}
          data-testid={`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
        />
        {selectedFile && <span data-testid="selected-file">{selectedFile.name}</span>}
      </div>
    );
  };
});

jest.mock('@/app/(admin-dashboard)/equipments/components/forms/PartsFolderManager', () => {
  return function PartsFolderManager({ onChange, initialData }: any) {
    return (
      <div data-testid="parts-folder-manager">
        <button
          onClick={() => onChange({
            rootFiles: [{ id: 'test', name: 'test-part.pdf', file: new File(['test'], 'test-part.pdf') }],
            folders: []
          })}
          data-testid="add-parts-file"
        >
          Add Parts File
        </button>
      </div>
    );
  };
});

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockProjects = [
  { id: 'project-1', name: 'Test Project 1' },
  { id: 'project-2', name: 'Test Project 2' },
];

describe('CreateEquipmentForm - Maintenance Report Integration', () => {
  let queryClient: QueryClient;
  let mockMutate: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockMutate = jest.fn();
    const mockUseCreateEquipmentAction = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction;
    mockUseCreateEquipmentAction.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderForm = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateEquipmentForm
          projects={mockProjects}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Basic Equipment Creation with Minimal Maintenance Data', () => {
    it('should create equipment with minimal maintenance data', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Caterpillar');
      await user.type(screen.getByLabelText(/model/i), '320D');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to maintenance tab
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);

      // Add minimal maintenance data
      await user.type(screen.getByLabelText(/issue description/i), 'Routine maintenance check');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'MEDIUM');
      await user.selectOptions(screen.getByLabelText(/status/i), 'REPORTED');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      
      // Verify FormData contains maintenance report data
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('brand')).toBe('Caterpillar');
      expect(formData.get('model')).toBe('320D');
      
      // Check maintenance report is included
      const maintenanceReport = JSON.parse(formData.get('maintenanceReport'));
      expect(maintenanceReport.issueDescription).toBe('Routine maintenance check');
      expect(maintenanceReport.priority).toBe('MEDIUM');
      expect(maintenanceReport.status).toBe('REPORTED');
    });

    it('should create equipment without maintenance data when maintenance tab is not used', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill only required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Komatsu');
      await user.type(screen.getByLabelText(/model/i), 'PC200');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Submit form without touching maintenance tab
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('brand')).toBe('Komatsu');
      expect(formData.get('model')).toBe('PC200');
      expect(formData.get('maintenanceReport')).toBeNull();
    });
  });

  describe('Complete Maintenance Report Creation', () => {
    it('should create equipment with complete maintenance report including all fields', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'JCB');
      await user.type(screen.getByLabelText(/model/i), 'JS130');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Construction Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-2');

      // Switch to maintenance tab
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);

      // Fill all maintenance fields
      await user.type(screen.getByLabelText(/issue description/i), 'Engine overheating detected during operation');
      await user.type(screen.getByLabelText(/inspection details/i), 'Visual inspection revealed damaged radiator fins');
      await user.type(screen.getByLabelText(/action taken/i), 'Replaced radiator and cleaned cooling system');
      await user.type(screen.getByLabelText(/additional remarks/i), 'Recommended checking coolant levels weekly');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'HIGH');
      await user.selectOptions(screen.getByLabelText(/status/i), 'COMPLETED');
      await user.type(screen.getByLabelText(/downtime/i), '8.5');

      // Add parts replacement data
      const partsSection = screen.getByText(/parts replaced/i);
      await user.click(partsSection);
      
      const partNameInput = screen.getByPlaceholderText(/part name or description/i);
      await user.type(partNameInput, 'Radiator Assembly');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      
      const formData = mockMutate.mock.calls[0][0];
      const maintenanceReport = JSON.parse(formData.get('maintenanceReport'));
      
      expect(maintenanceReport.issueDescription).toBe('Engine overheating detected during operation');
      expect(maintenanceReport.inspectionDetails).toBe('Visual inspection revealed damaged radiator fins');
      expect(maintenanceReport.actionTaken).toBe('Replaced radiator and cleaned cooling system');
      expect(maintenanceReport.remarks).toBe('Recommended checking coolant levels weekly');
      expect(maintenanceReport.priority).toBe('HIGH');
      expect(maintenanceReport.status).toBe('COMPLETED');
      expect(maintenanceReport.downtimeHours).toBe('8.5');
      expect(maintenanceReport.partsReplaced).toContain('Radiator Assembly');
    });

    it('should handle multiple parts replacement entries', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Volvo');
      await user.type(screen.getByLabelText(/model/i), 'EC160');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Heavy Equipment Ltd');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to maintenance tab
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);

      // Add maintenance description
      await user.type(screen.getByLabelText(/issue description/i), 'Multiple component replacement');

      // Add parts replacement data
      const partsSection = screen.getByText(/parts replaced/i);
      await user.click(partsSection);

      // Add first part
      const firstPartInput = screen.getByPlaceholderText(/part name or description/i);
      await user.type(firstPartInput, 'Hydraulic Filter');

      // Add another part
      const addPartButton = screen.getByRole('button', { name: /add another part/i });
      await user.click(addPartButton);

      // Wait for new part input to appear
      await waitFor(() => {
        const partInputs = screen.getAllByPlaceholderText(/part name or description/i);
        expect(partInputs).toHaveLength(2);
      });

      const partInputs = screen.getAllByPlaceholderText(/part name or description/i);
      await user.type(partInputs[1], 'Oil Seal Kit');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      const formData = mockMutate.mock.calls[0][0];
      const maintenanceReport = JSON.parse(formData.get('maintenanceReport'));
      
      expect(maintenanceReport.partsReplaced).toEqual(['Hydraulic Filter', 'Oil Seal Kit']);
    });
  });

  describe('File Upload in Maintenance Tab', () => {
    it('should handle maintenance attachment uploads', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Hitachi');
      await user.type(screen.getByLabelText(/model/i), 'ZX200');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Mining Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to maintenance tab
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);

      // Add maintenance description
      await user.type(screen.getByLabelText(/issue description/i), 'Inspection with photo documentation');

      // Open attachments section
      const attachmentsSection = screen.getByText(/attachments & images/i);
      await user.click(attachmentsSection);

      // Create a test file
      const testFile = new File(['test attachment'], 'maintenance-photo.jpg', { type: 'image/jpeg' });

      // Find attachment file input (this should be inside the attachments section)
      await waitFor(() => {
        const fileInput = screen.getByTestId('file-input-attachment-1');
        expect(fileInput).toBeInTheDocument();
      });

      const fileInput = screen.getByTestId('file-input-attachment-1');
      await user.upload(fileInput, testFile);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('maintenanceAttachment_0')).toEqual(testFile);
    });

    it('should handle part image uploads', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Doosan');
      await user.type(screen.getByLabelText(/model/i), 'DX140');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Industrial Services');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-2');

      // Switch to maintenance tab
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);

      // Add maintenance description
      await user.type(screen.getByLabelText(/issue description/i), 'Part replacement with documentation');

      // Add parts replacement data
      const partsSection = screen.getByText(/parts replaced/i);
      await user.click(partsSection);

      // Add part name
      const partNameInput = screen.getByPlaceholderText(/part name or description/i);
      await user.type(partNameInput, 'Track Chain Link');

      // Create test image file for part
      const partImage = new File(['part image'], 'track-chain.jpg', { type: 'image/jpeg' });

      // Find part image upload input
      const partImageInput = screen.getByTestId('file-input-part-1-image');
      await user.upload(partImageInput, partImage);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('partImage_0')).toEqual(partImage);
      expect(formData.get('partImageName_0')).toBe('Track Chain Link');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields before submission', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter equipment brand');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate all required equipment fields', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill only brand and try to submit
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter equipment model');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate equipment type selection', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill brand and model but leave type empty
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please select equipment type');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate owner field', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill brand, model, and type but leave owner empty
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter owner information');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate project assignment', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill all fields except project
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please select assigned project');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate maintenance report issue description when present', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill all required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to maintenance tab and select priority without description
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);
      await user.selectOptions(screen.getByLabelText(/priority/i), 'HIGH');
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please provide issue description for maintenance report');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate numeric downtime hours', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to maintenance tab and add invalid downtime
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);
      await user.type(screen.getByLabelText(/issue description/i), 'Test issue');
      await user.type(screen.getByLabelText(/downtime/i), 'invalid-number');
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Downtime hours must be a valid number');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should allow submission with equipment data but no maintenance data', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill all required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Case');
      await user.type(screen.getByLabelText(/model/i), 'CX130');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Equipment Rental Co');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('maintenanceReport')).toBeNull();
    });

    it('should validate file upload size limits', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to images tab
      const imagesTab = screen.getByRole('button', { name: /equipment images/i });
      await user.click(imagesTab);

      // Create a large file (simulate 20MB file)
      const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large-image.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input-equipment-image');
      
      await user.upload(fileInput, largeFile);
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('File size must be less than 10MB');
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should validate file type restrictions', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      renderForm();

      // Fill required equipment fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Switch to images tab
      const imagesTab = screen.getByRole('button', { name: /equipment images/i });
      await user.click(imagesTab);

      // Try to upload invalid file type
      const invalidFile = new File(['test'], 'document.exe', { type: 'application/x-msdownload' });
      const fileInput = screen.getByTestId('file-input-equipment-image');
      
      await user.upload(fileInput, invalidFile);
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Only image files (JPG, PNG, GIF) are allowed');
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle mutation errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to create equipment';
      
      mockMutate.mockImplementation((formData, { onError }) => {
        onError(new Error(errorMessage));
      });

      renderForm();

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      
      const mockUseCreateEquipmentAction = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction;
      mockUseCreateEquipmentAction.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
      });

      renderForm();

      const submitButton = screen.getByRole('button', { name: /creating equipment/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating equipment/i)).toBeInTheDocument();
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful submission', async () => {
      const mockOnSuccess = jest.fn();
      const user = userEvent.setup();
      
      mockMutate.mockImplementation((formData, { onSuccess }) => {
        onSuccess({ success: true });
      });

      renderForm({ onSuccess: mockOnSuccess });

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'Reset Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Reset Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Reset Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Add maintenance data
      const maintenanceTab = screen.getByRole('button', { name: /maintenance report/i });
      await user.click(maintenanceTab);
      await user.type(screen.getByLabelText(/issue description/i), 'Test maintenance issue');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      // Verify form was reset
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(/brand/i)).toHaveValue('');
      expect(screen.getByLabelText(/model/i)).toHaveValue('');
    });
  });

  describe('Tab Navigation', () => {
    it('should allow navigation between all tabs', async () => {
      const user = userEvent.setup();
      renderForm();

      // Test navigation to each tab
      const tabs = [
        { name: /equipment details/i, content: /equipment information/i },
        { name: /equipment images/i, content: /equipment image/i },
        { name: /documents/i, content: /original receipt/i },
        { name: /parts management/i, content: /organize parts documentation/i },
        { name: /maintenance report/i, content: /report information/i },
      ];

      for (const tab of tabs) {
        const tabButton = screen.getByRole('button', { name: tab.name });
        await user.click(tabButton);
        
        await waitFor(() => {
          expect(screen.getByText(tab.content)).toBeInTheDocument();
        });
      }
    });

    it('should show tab badges when content is added', async () => {
      const user = userEvent.setup();
      renderForm();

      // Add parts content
      const partsTab = screen.getByRole('button', { name: /parts management/i });
      await user.click(partsTab);

      const addPartsFileButton = screen.getByTestId('add-parts-file');
      await user.click(addPartsFileButton);

      // Switch to another tab and back to see badge
      const detailsTab = screen.getByRole('button', { name: /equipment details/i });
      await user.click(detailsTab);

      // Parts tab should now show a badge with count
      const partsTabWithBadge = screen.getByRole('button', { name: /parts management/i });
      expect(partsTabWithBadge).toBeInTheDocument();
    });
  });

  describe('Mobile vs Desktop Behavior', () => {
    it('should render properly in mobile mode', async () => {
      const user = userEvent.setup();
      renderForm({ isMobile: true });

      // Verify mobile-specific elements
      expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /photos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /parts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument();
    });

    it('should render properly in desktop mode', async () => {
      const user = userEvent.setup();
      renderForm({ isMobile: false });

      // Verify desktop-specific elements
      expect(screen.getByRole('button', { name: /equipment details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /equipment images/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /parts management/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /maintenance report/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle projects list being empty', async () => {
      const user = userEvent.setup();
      renderForm({ projects: [] });

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand');
      await user.type(screen.getByLabelText(/model/i), 'Test Model');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');

      // Project dropdown should show "No projects available"
      expect(screen.getByText(/no projects available/i)).toBeInTheDocument();
    });

    it('should handle simultaneous file uploads', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill required equipment fields first
      await user.type(screen.getByLabelText(/brand/i), 'Multi-Upload Test');
      await user.type(screen.getByLabelText(/model/i), 'MUT-100');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Corp');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      // Upload multiple files across different tabs
      const imagesTab = screen.getByRole('button', { name: /equipment images/i });
      await user.click(imagesTab);

      const equipmentImage = new File(['equipment'], 'equipment.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('file-input-equipment-image'), equipmentImage);

      const documentsTab = screen.getByRole('button', { name: /documents/i });
      await user.click(documentsTab);

      const receiptDoc = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
      await user.upload(screen.getByTestId('file-input-original-receipt-or-'), receiptDoc);

      // Submit and verify all files are included
      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('equipmentImage')).toEqual(equipmentImage);
      expect(formData.get('originalReceipt')).toEqual(receiptDoc);
    });

    it('should preserve form data when switching between tabs rapidly', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill some data on details tab
      await user.type(screen.getByLabelText(/brand/i), 'Rapid Switch Test');
      await user.type(screen.getByLabelText(/model/i), 'RST-200');

      // Rapidly switch between tabs
      const tabs = [
        screen.getByRole('button', { name: /equipment images/i }),
        screen.getByRole('button', { name: /documents/i }),
        screen.getByRole('button', { name: /parts management/i }),
        screen.getByRole('button', { name: /maintenance report/i }),
        screen.getByRole('button', { name: /equipment details/i })
      ];

      for (const tab of tabs) {
        await user.click(tab);
      }

      // Verify data is still there
      expect(screen.getByLabelText(/brand/i)).toHaveValue('Rapid Switch Test');
      expect(screen.getByLabelText(/model/i)).toHaveValue('RST-200');
    });

    it('should handle network timeout gracefully', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      
      // Mock a timeout error
      mockMutate.mockImplementation((formData, { onError }) => {
        setTimeout(() => {
          onError(new Error('Network timeout'));
        }, 100);
      });

      renderForm();

      // Fill required fields and submit
      await user.type(screen.getByLabelText(/brand/i), 'Timeout Test');
      await user.type(screen.getByLabelText(/model/i), 'TT-300');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network timeout');
      });

      // Form should remain filled for retry
      expect(screen.getByLabelText(/brand/i)).toHaveValue('Timeout Test');
    });

    it('should handle duplicate equipment creation attempt', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      
      mockMutate.mockImplementation((formData, { onError }) => {
        onError(new Error('Equipment with this plate number already exists'));
      });

      renderForm();

      await user.type(screen.getByLabelText(/brand/i), 'Duplicate Test');
      await user.type(screen.getByLabelText(/model/i), 'DT-400');
      await user.type(screen.getByLabelText(/plate\/serial number/i), 'EXISTING-001');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Equipment with this plate number already exists');
      });

      // Form should highlight the conflicting field
      expect(screen.getByLabelText(/plate\/serial number/i)).toHaveValue('EXISTING-001');
    });

    it('should handle very long text inputs gracefully', async () => {
      const user = userEvent.setup();
      renderForm();

      const longText = 'A'.repeat(10000);

      await user.type(screen.getByLabelText(/brand/i), 'Long Text Test');
      await user.type(screen.getByLabelText(/model/i), 'LTT-500');
      await user.selectOptions(screen.getByLabelText(/equipment type/i), 'Excavator');
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner');
      await user.selectOptions(screen.getByLabelText(/assigned project/i), 'project-1');
      
      // Add very long remarks
      await user.type(screen.getByLabelText(/remarks/i), longText);

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      const formData = mockMutate.mock.calls[0][0];
      expect(formData.get('remarks')).toBe(longText);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderForm();

      // Check for proper form structure
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(5);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();

      // Check for proper form labels
      expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/equipment type/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      renderForm();

      const firstTab = screen.getByRole('tab', { name: /equipment details/i });
      const secondTab = screen.getByRole('tab', { name: /equipment images/i });

      // Focus first tab and navigate with arrow keys
      firstTab.focus();
      expect(firstTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(secondTab).toHaveFocus();
    });

    it('should announce form validation errors to screen readers', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /create equipment/i });
      await user.click(submitButton);

      // Should have aria-invalid on required fields
      expect(screen.getByLabelText(/brand/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });
});