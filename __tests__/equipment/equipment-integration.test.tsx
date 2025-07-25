/**
 * Equipment Integration Tests
 * Tests the complete CRUD flow including forms, actions, and data flow
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateEquipmentForm from '@/app/(admin-dashboard)/equipments/components/forms/CreateEquipmentForm'

// Mock the entire equipments module
jest.mock('@/app/(admin-dashboard)/equipments/actions', () => ({
  createEquipmentAction: jest.fn(),
  updateEquipmentAction: jest.fn(),
}))

// Mock the hooks
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useCreateEquipmentAction: jest.fn(),
  useUpdateEquipmentAction: jest.fn(),
  useEquipmentsQuery: jest.fn(),
}))

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (typeof date === 'string') return date
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15'
    }
    return 'January 15, 2024'
  }),
}))

// Mock UI components that might cause issues
jest.mock('@/components/equipment/FileUploadSectionSimple', () => {
  return function MockFileUploadSection({ 
    label, 
    onFileChange, 
    selectedFile, 
    accept 
  }: any) {
    return (
      <div data-testid={`file-upload-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
        <label htmlFor={`file-${label}`}>{label}</label>
        <input
          id={`file-${label}`}
          type="file"
          accept={accept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          data-testid={`file-input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        />
        {selectedFile && (
          <div data-testid={`file-selected-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
            File selected: {selectedFile.name}
          </div>
        )}
      </div>
    )
  }
})

jest.mock('@/app/(admin-dashboard)/equipments/components/forms/PartsFolderManager', () => {
  return function MockPartsFolderManager({ onChange, initialData }: any) {
    return (
      <div data-testid="parts-folder-manager">
        <div>Parts Manager</div>
        <button
          data-testid="add-root-file"
          onClick={() => {
            const newStructure = {
              ...initialData,
              rootFiles: [
                ...initialData.rootFiles,
                { 
                  id: `root-${Date.now()}`, 
                  name: 'test-part.jpg', 
                  file: new File(['test'], 'test-part.jpg', { type: 'image/jpeg' }),
                  type: 'image'
                }
              ]
            }
            onChange(newStructure)
          }}
        >
          Add Root File
        </button>
        <button
          data-testid="add-folder"
          onClick={() => {
            const newStructure = {
              ...initialData,
              folders: [
                ...initialData.folders,
                {
                  id: `folder-${Date.now()}`,
                  name: 'Test Folder',
                  files: [
                    {
                      id: `file-${Date.now()}`,
                      name: 'folder-part.jpg',
                      file: new File(['test'], 'folder-part.jpg', { type: 'image/jpeg' }),
                      type: 'image'
                    }
                  ]
                }
              ]
            }
            onChange(newStructure)
          }}
        >
          Add Folder
        </button>
        <div data-testid="parts-count">
          Total files: {initialData.rootFiles.length + initialData.folders.reduce((sum: number, folder: any) => sum + folder.files.length, 0)}
        </div>
      </div>
    )
  }
})

// Mock Calendar and Popover components
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar">
      <button
        data-testid="select-date"
        onClick={() => onSelect(new Date('2024-01-15'))}
      >
        Select Date: January 15, 2024
      </button>
      {selected && (
        <div data-testid="selected-date">
          Selected: {selected.toISOString()}
        </div>
      )}
    </div>
  )
}))

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}))

describe('Equipment Integration Tests', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  const mockProjects = [
    { id: 'project-1', name: 'Construction Project Alpha' },
    { id: 'project-2', name: 'Infrastructure Development Beta' },
    { id: 'project-3', name: 'Building Renovation Gamma' },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    user = userEvent.setup()
    jest.clearAllMocks()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('Complete Equipment Creation Flow', () => {
    it('should complete full equipment creation with all data types', async () => {
      const mockMutate = jest.fn()
      const mockCreateAction = require('@/app/(admin-dashboard)/equipments/actions').createEquipmentAction
      const mockHook = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction

      // Setup successful response
      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: {
          id: 'equipment-123',
          brand: 'Caterpillar',
          model: '320D',
          type: 'Excavator'
        }
      })

      mockHook.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm 
          projects={mockProjects}
          onSuccess={jest.fn()}
        />
      )

      // Step 1: Fill basic equipment details
      await user.type(screen.getByLabelText(/brand/i), 'Caterpillar')
      await user.type(screen.getByLabelText(/model/i), '320D')
      await user.type(screen.getByLabelText(/plate\/serial number/i), 'CAT-320D-001')
      await user.type(screen.getByLabelText(/owner/i), 'Heavy Equipment Corp')

      // Select equipment type
      const typeSelect = screen.getByRole('combobox')
      await user.click(typeSelect)
      await user.click(screen.getByText('Excavator'))

      // Select project
      const projectSelects = screen.getAllByRole('combobox')
      const projectSelect = projectSelects[1] // Second combobox should be project
      await user.click(projectSelect)
      await user.click(screen.getByText('Construction Project Alpha'))

      // Select status
      const statusSelect = projectSelects[2] // Third combobox should be status
      await user.click(statusSelect)
      await user.click(screen.getByText('Operational'))

      // Set inspection frequency
      const frequencySelect = projectSelects[3] // Fourth combobox should be frequency
      await user.click(frequencySelect)
      await user.click(screen.getByText('Every 6 months'))

      // Add remarks
      await user.type(screen.getByLabelText(/remarks/i), 'Primary excavator for foundation work')

      // Step 2: Set dates
      const inspectionDateButton = screen.getByRole('button', { name: /pick inspection date/i })
      await user.click(inspectionDateButton)
      await user.click(screen.getByTestId('select-date'))

      // Step 3: Upload equipment images
      const photosTab = screen.getByRole('button', { name: /equipment images/i })
      await user.click(photosTab)

      const equipmentImageFile = new File(['equipment photo'], 'excavator.jpg', { type: 'image/jpeg' })
      const equipmentImageInput = screen.getByTestId('file-input-equipment-image')
      await user.upload(equipmentImageInput, equipmentImageFile)

      const inspectionImageFile = new File(['inspection photo'], 'inspection.jpg', { type: 'image/jpeg' })
      const inspectionImageInput = screen.getByTestId('file-input-third-party-inspection')
      await user.upload(inspectionImageInput, inspectionImageFile)

      // Step 4: Upload documents
      const documentsTab = screen.getByRole('button', { name: /documents/i })
      await user.click(documentsTab)

      const receiptFile = new File(['receipt pdf'], 'receipt.pdf', { type: 'application/pdf' })
      const receiptInput = screen.getByTestId('file-input-original-receipt--or-')
      await user.upload(receiptInput, receiptFile)

      // Step 5: Add parts
      const partsTab = screen.getByRole('button', { name: /parts management/i })
      await user.click(partsTab)

      await user.click(screen.getByTestId('add-root-file'))
      await user.click(screen.getByTestId('add-folder'))

      // Verify parts were added
      expect(screen.getByText('Total files: 2')).toBeInTheDocument()

      // Step 6: Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Verify submission
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
        const formData = mockMutate.mock.calls[0][0]
        
        // Verify form data contains all expected fields
        expect(formData.get('brand')).toBe('Caterpillar')
        expect(formData.get('model')).toBe('320D')
        expect(formData.get('plateNumber')).toBe('CAT-320D-001')
        expect(formData.get('owner')).toBe('Heavy Equipment Corp')
        expect(formData.get('type')).toBe('Excavator')
        expect(formData.get('projectId')).toBe('project-1')
        expect(formData.get('status')).toBe('OPERATIONAL')
        expect(formData.get('before')).toBe('6')
        expect(formData.get('remarks')).toBe('Primary excavator for foundation work')
        expect(formData.get('inspectionDate')).toBe('2024-01-15')
      })
    })

    it('should handle validation errors and maintain form state', async () => {
      const mockMutate = jest.fn((formData, { onError }) => {
        onError(new Error('Validation failed: Missing project assignment'))
      })

      const mockHook = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      mockHook.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: true,
        error: new Error('Validation failed'),
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill some fields
      await user.type(screen.getByLabelText(/brand/i), 'Komatsu')
      await user.type(screen.getByLabelText(/model/i), 'PC200')

      // Try to submit without all required fields
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Form state should be preserved after error
      await waitFor(() => {
        expect(screen.getByLabelText(/brand/i)).toHaveValue('Komatsu')
        expect(screen.getByLabelText(/model/i)).toHaveValue('PC200')
      })
    })

    it('should reset form after successful submission', async () => {
      const mockOnSuccess = jest.fn()
      const mockMutate = jest.fn((formData, { onSuccess }) => {
        onSuccess({
          success: true,
          equipment: { id: 'new-equipment', brand: 'Test', model: 'Test' }
        })
      })

      const mockHook = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      mockHook.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm 
          projects={mockProjects}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'Volvo')
      await user.type(screen.getByLabelText(/model/i), 'EC200D')
      await user.type(screen.getByLabelText(/owner/i), 'Construction Ltd')

      const comboboxes = screen.getAllByRole('combobox')
      const typeSelect = comboboxes[0]
      await user.click(typeSelect)
      await user.click(screen.getByText('Excavator'))

      const projectSelect = comboboxes[1]
      await user.click(projectSelect)
      await user.click(screen.getByText('Construction Project Alpha'))

      // Submit
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Verify form reset and callback
      await waitFor(() => {
        expect(screen.getByLabelText(/brand/i)).toHaveValue('')
        expect(screen.getByLabelText(/model/i)).toHaveValue('')
        expect(screen.getByLabelText(/owner/i)).toHaveValue('')
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('File Upload Integration', () => {
    it('should handle multiple file uploads across different tabs', async () => {
      const mockMutate = jest.fn()
      const mockHook = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      mockHook.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill required fields first
      await user.type(screen.getByLabelText(/brand/i), 'JCB')
      await user.type(screen.getByLabelText(/model/i), 'JS130')
      await user.type(screen.getByLabelText(/owner/i), 'Equipment Rental Co')

      const comboboxes = screen.getAllByRole('combobox')
      const typeSelect = comboboxes[0]
      await user.click(typeSelect)
      await user.click(screen.getByText('Excavator'))

      const projectSelect = comboboxes[1]
      await user.click(projectSelect)
      await user.click(screen.getByText('Infrastructure Development Beta'))

      // Upload photos
      const photosTab = screen.getByRole('button', { name: /equipment images/i })  
      await user.click(photosTab)

      const equipmentImage = new File(['equipment'], 'equipment.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByTestId('file-input-equipment-image'), equipmentImage)

      const inspectionImage = new File(['inspection'], 'inspection.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByTestId('file-input-third-party-inspection'), inspectionImage)

      // Upload documents
      const documentsTab = screen.getByRole('button', { name: /documents/i })
      await user.click(documentsTab)

      const receiptDoc = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input-original-receipt--or-'), receiptDoc)

      // Add parts
      const partsTab = screen.getByRole('button', { name: /parts management/i })
      await user.click(partsTab)

      await user.click(screen.getByTestId('add-root-file'))

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Verify all files are included in submission
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
        const formData = mockMutate.mock.calls[0][0]
        
        // Check that files were added to FormData
        expect(formData.get('equipmentImage')).toEqual(equipmentImage)
        expect(formData.get('thirdpartyInspection')).toEqual(inspectionImage)
        expect(formData.get('originalReceipt')).toEqual(receiptDoc)
        
        // Check parts structure
        const partsStructure = JSON.parse(formData.get('partsStructure'))
        expect(partsStructure.rootFiles).toHaveLength(1)
      })
    })

    it('should show file upload confirmation', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      const photosTab = screen.getByRole('button', { name: /equipment images/i })
      await user.click(photosTab)

      const testFile = new File(['test'], 'test-equipment.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-equipment-image')
      
      await user.upload(fileInput, testFile)

      expect(screen.getByTestId('file-selected-equipment-image')).toBeInTheDocument()
      expect(screen.getByText('File selected: test-equipment.jpg')).toBeInTheDocument()
    })
  })

  describe('Form State Management', () => {
    it('should maintain form state when switching between tabs', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill details on first tab
      await user.type(screen.getByLabelText(/brand/i), 'Liebherr')
      await user.type(screen.getByLabelText(/model/i), 'R920')

      // Switch to photos tab
      const photosTab = screen.getByRole('button', { name: /equipment images/i })
      await user.click(photosTab)

      // Upload a file
      const testFile = new File(['photo'], 'liebherr.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByTestId('file-input-equipment-image'), testFile)

      // Switch back to details tab
      const detailsTab = screen.getByRole('button', { name: /equipment details/i })
      await user.click(detailsTab)

      // Verify data is still there
      expect(screen.getByLabelText(/brand/i)).toHaveValue('Liebherr')
      expect(screen.getByLabelText(/model/i)).toHaveValue('R920')

      // Switch back to photos and verify file is still there
      await user.click(photosTab)
      expect(screen.getByText('File selected: liebherr.jpg')).toBeInTheDocument()
    })

    it('should show loading state during submission', async () => {
      const mockHook = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      mockHook.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      const submitButton = screen.getByRole('button', { name: /creating equipment/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Creating Equipment...')).toBeInTheDocument()
    })
  })

  describe('Data Validation Integration', () => {
    it('should validate required fields before allowing submission', async () => {
      const mockMutate = jest.fn()
      const mockHook = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      mockHook.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Should not call mutate due to client-side validation
      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('should show appropriate error messages for invalid inputs', async () => {
      const { toast } = require('sonner')
      
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Should show error toast for missing brand
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please enter equipment brand')
      })
    })
  })
})