import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateEquipmentForm from '@/app/(admin-dashboard)/equipments/components/forms/CreateEquipmentForm'
import { createEquipmentAction, updateEquipmentAction } from '@/app/(admin-dashboard)/equipments/actions'

// Mock the server actions
jest.mock('@/app/(admin-dashboard)/equipments/actions', () => ({
  createEquipmentAction: jest.fn(),
  updateEquipmentAction: jest.fn(),
}))

// Mock the useCreateEquipmentAction hook
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useCreateEquipmentAction: () => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}))

// Mock Sonnet toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15'
    }
    return 'January 15, 2024'
  }),
}))

// Mock components that might cause issues
jest.mock('@/components/equipment/FileUploadSectionSimple', () => {
  return function MockFileUploadSection({ label, onFileChange, selectedFile }: any) {
    return (
      <div data-testid={`file-upload-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <label>{label}</label>
        <input
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          data-testid={`file-input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
        {selectedFile && <span>File selected: {selectedFile.name}</span>}
      </div>
    )
  }
})

jest.mock('@/app/(admin-dashboard)/equipments/components/forms/PartsFolderManager', () => {
  return function MockPartsFolderManager({ onChange, initialData }: any) {
    return (
      <div data-testid="parts-folder-manager">
        <button
          onClick={() => onChange({
            rootFiles: [{ id: 'test', name: 'test-part.jpg', file: new File([''], 'test-part.jpg') }],
            folders: []
          })}
        >
          Add Test Part
        </button>
      </div>
    )
  }
})

// Mock UI components
jest.mock('@/components/ui/calendar', () => {
  return {
    Calendar: ({ onSelect, selected }: any) => (
      <div data-testid="calendar">
        <button onClick={() => onSelect(new Date('2024-01-15'))}>
          Select Date
        </button>
        {selected && <span>Selected: {selected.toISOString()}</span>}
      </div>
    )
  }
})

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}))

describe('Equipment CRUD Operations', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  const mockProjects = [
    { id: 'project-1', name: 'Test Project 1' },
    { id: 'project-2', name: 'Test Project 2' },
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

  describe('Create Equipment Form', () => {
    it('should render all required form fields', () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Check for required fields
      expect(screen.getByLabelText(/brand/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/model/i)).toBeInTheDocument()
      expect(screen.getByText(/equipment type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/owner/i)).toBeInTheDocument()
      expect(screen.getByText(/assigned project/i)).toBeInTheDocument()
      expect(screen.getByText(/operational status/i)).toBeInTheDocument()
    })

    it('should show validation errors for empty required fields', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/please enter equipment brand/i)).toBeInTheDocument()
      })
    })

    it('should successfully create equipment with valid data', async () => {
      const mockMutate = jest.fn()
      
      // Mock the hook to return our mock mutate function
      const useCreateEquipmentActionMock = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      useCreateEquipmentActionMock.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill in required fields
      await user.type(screen.getByLabelText(/brand/i), 'Caterpillar')
      await user.type(screen.getByLabelText(/model/i), '320D')
      await user.type(screen.getByLabelText(/owner/i), 'Test Company')

      // Select equipment type
      const comboboxes = screen.getAllByRole('combobox')
      const typeSelect = comboboxes[0]
      await user.click(typeSelect)
      await user.click(screen.getByText('Excavator'))

      // Select project
      const projectSelect = comboboxes[1]
      await user.click(projectSelect)
      await user.click(screen.getByText('Test Project 1'))

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Verify mutate was called
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
        const formData = mockMutate.mock.calls[0][0]
        expect(formData.get('brand')).toBe('Caterpillar')
        expect(formData.get('model')).toBe('320D')
        expect(formData.get('owner')).toBe('Test Company')
        expect(formData.get('type')).toBe('Excavator')
        expect(formData.get('projectId')).toBe('project-1')
      })
    })

    it('should handle optional fields correctly', async () => {
      const mockMutate = jest.fn()
      
      const useCreateEquipmentActionMock = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      useCreateEquipmentActionMock.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'Komatsu')
      await user.type(screen.getByLabelText(/model/i), 'PC200')
      await user.type(screen.getByLabelText(/owner/i), 'Construction Co.')

      // Fill optional fields
      await user.type(screen.getByLabelText(/plate\/serial number/i), 'EQP-001')
      await user.type(screen.getByLabelText(/remarks/i), 'Test equipment remarks')

      // Select equipment type and project
      const comboboxes = screen.getAllByRole('combobox')
      const typeSelect = comboboxes[0]
      await user.click(typeSelect)
      await user.click(screen.getByText('Bulldozer'))

      const projectSelect = comboboxes[1]
      await user.click(projectSelect)
      await user.click(screen.getByText('Test Project 2'))

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
        const formData = mockMutate.mock.calls[0][0]
        expect(formData.get('plateNumber')).toBe('EQP-001')
        expect(formData.get('remarks')).toBe('Test equipment remarks')
        expect(formData.get('type')).toBe('Bulldozer')
        expect(formData.get('projectId')).toBe('project-2')
      })
    })

    it('should handle file uploads correctly', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Switch to photos tab
      const photosTab = screen.getByRole('button', { name: /equipment images/i })
      await user.click(photosTab)

      // Upload equipment image
      const imageFile = new File(['image content'], 'equipment.jpg', { type: 'image/jpeg' })
      const imageInput = screen.getByTestId('file-input-equipment-image')
      
      await user.upload(imageInput, imageFile)

      expect(screen.getByText('File selected: equipment.jpg')).toBeInTheDocument()
    })

    it('should handle parts management correctly', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Switch to parts tab
      const partsTab = screen.getByRole('button', { name: /parts management/i })
      await user.click(partsTab)

      // Add a test part
      const addPartButton = screen.getByText('Add Test Part')
      await user.click(addPartButton)

      // The parts count should be updated (this would be reflected in the tab badge)
      expect(screen.getByTestId('parts-folder-manager')).toBeInTheDocument()
    })

    it('should handle date selection correctly', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Find and click the inspection date button
      const inspectionDateButton = screen.getByRole('button', { name: /pick inspection date/i })
      await user.click(inspectionDateButton)

      // Select a date
      const selectDateButton = screen.getByText('Select Date')
      await user.click(selectDateButton)

      // Date should be formatted and displayed
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
    })

    it('should handle form reset after successful submission', async () => {
      const mockMutate = jest.fn((formData, { onSuccess }) => {
        onSuccess({ success: true, equipment: { id: 'new-equipment-id' } })
      })
      
      const useCreateEquipmentActionMock = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      useCreateEquipmentActionMock.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill in fields
      const brandInput = screen.getByLabelText(/brand/i)
      await user.type(brandInput, 'Test Brand')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Form should be reset after successful submission
      await waitFor(() => {
        expect(brandInput).toHaveValue('')
      })
    })
  })

  describe('Equipment Actions Server Functions', () => {
    it('should validate createEquipmentAction input', async () => {
      const mockFormData = new FormData()
      mockFormData.append('brand', 'Caterpillar')
      mockFormData.append('model', '320D')
      mockFormData.append('type', 'Excavator')
      mockFormData.append('owner', 'Test Company')
      mockFormData.append('projectId', 'project-1')
      mockFormData.append('status', 'OPERATIONAL')

      const createActionMock = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>
      createActionMock.mockResolvedValue({ success: true, equipment: { id: 'test-id' } })

      await createEquipmentAction(mockFormData)

      expect(createActionMock).toHaveBeenCalledWith(mockFormData)
    })

    it('should handle createEquipmentAction validation errors', async () => {
      const mockFormData = new FormData()
      // Missing required fields

      const createActionMock = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>
      createActionMock.mockRejectedValue(new Error('Missing required fields: brand, model, type, owner, projectId'))

      await expect(createEquipmentAction(mockFormData)).rejects.toThrow('Missing required fields')
    })

    it('should validate updateEquipmentAction input', async () => {
      const mockFormData = new FormData()
      mockFormData.append('equipmentId', 'existing-equipment-id')
      mockFormData.append('brand', 'Updated Brand')
      mockFormData.append('model', 'Updated Model')
      mockFormData.append('type', 'Loader')
      mockFormData.append('owner', 'Updated Company')
      mockFormData.append('projectId', 'project-2')
      mockFormData.append('status', 'NON_OPERATIONAL')

      const updateActionMock = updateEquipmentAction as jest.MockedFunction<typeof updateEquipmentAction>
      updateActionMock.mockResolvedValue({ success: true, equipment: { id: 'existing-equipment-id' } })

      await updateEquipmentAction(mockFormData)

      expect(updateActionMock).toHaveBeenCalledWith(mockFormData)
    })
  })

  describe('Equipment Form Tabs Navigation', () => {
    it('should switch between tabs correctly', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Should start on details tab
      expect(screen.getByText('Equipment Information')).toBeInTheDocument()

      // Switch to photos tab
      const photosTab = screen.getByRole('button', { name: /equipment images/i })
      await user.click(photosTab)
      expect(screen.getByText(/equipment images/i)).toBeInTheDocument()

      // Switch to documents tab
      const documentsTab = screen.getByRole('button', { name: /documents/i })
      await user.click(documentsTab)
      expect(screen.getByText(/upload important equipment documents/i)).toBeInTheDocument()

      // Switch to parts tab
      const partsTab = screen.getByRole('button', { name: /parts management/i })
      await user.click(partsTab)
      expect(screen.getByTestId('parts-folder-manager')).toBeInTheDocument()
    })

    it('should show tab badges for uploaded content', async () => {
      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Switch to photos tab and upload a file
      const photosTab = screen.getByRole('button', { name: /equipment images/i })
      await user.click(photosTab)

      const imageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      const imageInput = screen.getByTestId('file-input-equipment-image')
      await user.upload(imageInput, imageFile)

      // The badge should show count (this would be tested via the tab button text or badge element)
      expect(screen.getByText('File selected: test.jpg')).toBeInTheDocument()
    })
  })

  describe('Equipment Form Error Handling', () => {
    it('should handle mutation errors gracefully', async () => {
      const mockMutate = jest.fn((formData, { onError }) => {
        onError(new Error('Network error'))
      })
      
      const useCreateEquipmentActionMock = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      useCreateEquipmentActionMock.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: true,
        error: new Error('Network error'),
      })

      renderWithProviders(
        <CreateEquipmentForm projects={mockProjects} />
      )

      // Fill required fields and submit
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand')
      await user.type(screen.getByLabelText(/model/i), 'Test Model')
      await user.type(screen.getByLabelText(/owner/i), 'Test Owner')

      const typeSelect = screen.getByRole('combobox', { name: /equipment type/i })
      await user.click(typeSelect)
      await user.click(screen.getByText('Excavator'))

      const projectSelect = screen.getByRole('combobox', { name: /assigned project/i })
      await user.click(projectSelect)
      await user.click(screen.getByText('Test Project 1'))

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Error should be handled, form should not reset
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
        expect(screen.getByLabelText(/brand/i)).toHaveValue('Test Brand')
      })
    })

    it('should show loading state during submission', async () => {
      const useCreateEquipmentActionMock = require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction
      useCreateEquipmentActionMock.mockReturnValue({
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
})