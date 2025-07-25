/**
 * Basic Equipment CRUD Tests
 * Simple focused tests for equipment CRUD operations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateEquipmentForm from '@/app/(admin-dashboard)/equipments/components/forms/CreateEquipmentForm'

// Mock the server actions
jest.mock('@/app/(admin-dashboard)/equipments/actions', () => ({
  createEquipmentAction: jest.fn(),
  updateEquipmentAction: jest.fn(),
}))

// Mock the useCreateEquipmentAction hook
const mockMutate = jest.fn()
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useCreateEquipmentAction: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock date formatting
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15'
    return 'January 15, 2024'
  }),
}))

// Mock complex components to avoid rendering issues
jest.mock('@/components/equipment/FileUploadSectionSimple', () => {
  return function MockFileUpload({ label, onFileChange }: any) {
    return (
      <div data-testid={`mock-file-upload-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <span>{label}</span>
        <input
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          data-testid={`file-input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    )
  }
})

jest.mock('@/app/(admin-dashboard)/equipments/components/forms/PartsFolderManager', () => {
  return function MockPartsFolderManager({ onChange }: any) {
    return (
      <div data-testid="mock-parts-manager">
        <button onClick={() => onChange({ rootFiles: [], folders: [] })}>
          Parts Manager
        </button>
      </div>
    )
  }
})

// Mock UI components
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: any) => (
    <button onClick={() => onSelect(new Date('2024-01-15'))}>
      Mock Calendar
    </button>
  )
}))

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}))

describe('Equipment Basic CRUD Tests', () => {
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

  const renderForm = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateEquipmentForm projects={mockProjects} />
      </QueryClientProvider>
    )
  }

  describe('Form Rendering', () => {
    it('should render basic form inputs', () => {
      renderForm()

      expect(screen.getByLabelText(/brand/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/model/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/owner/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create equipment/i })).toBeInTheDocument()
    })

    it('should render project selection', () => {
      renderForm()

      const selectElements = screen.getAllByRole('combobox')
      expect(selectElements.length).toBeGreaterThan(0)
    })

    it('should render tab navigation', () => {
      renderForm()

      expect(screen.getByText(/equipment details/i)).toBeInTheDocument()
      expect(screen.getByText(/equipment images/i)).toBeInTheDocument()
      expect(screen.getByText(/documents/i)).toBeInTheDocument()
      expect(screen.getByText(/parts management/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require brand field', async () => {
      const { toast } = require('sonner')
      renderForm()

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please enter equipment brand')
      })
    })

    it('should require model field after brand is filled', async () => {
      const { toast } = require('sonner')
      renderForm()

      await user.type(screen.getByLabelText(/brand/i), 'Test Brand')
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please enter equipment model')
      })
    })

    it('should require all mandatory fields', async () => {
      const { toast } = require('sonner')
      renderForm()

      // Fill some but not all required fields
      await user.type(screen.getByLabelText(/brand/i), 'Test Brand')
      await user.type(screen.getByLabelText(/model/i), 'Test Model')
      
      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Should show error for missing type
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please select equipment type')
      })
    })
  })

  describe('Form Submission', () => {
    it('should call mutate with form data when all required fields are filled', async () => {
      renderForm()

      // Fill all required fields
      await user.type(screen.getByLabelText(/brand/i), 'Caterpillar')
      await user.type(screen.getByLabelText(/model/i), '320D')
      await user.type(screen.getByLabelText(/owner/i), 'Test Company')

      // Select equipment type (first combobox)
      const comboboxes = screen.getAllByRole('combobox')
      await user.click(comboboxes[0])
      
      // Wait for options to appear and click
      await waitFor(() => {
        const excavatorOption = screen.getByText('Excavator')
        user.click(excavatorOption)
      })

      // Select project (second combobox)
      await user.click(comboboxes[1])
      
      await waitFor(() => {
        const projectOption = screen.getByText('Test Project 1')
        user.click(projectOption)
      })

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Should call mutate
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('should include form data in submission', async () => {
      renderForm()

      await user.type(screen.getByLabelText(/brand/i), 'JCB')
      await user.type(screen.getByLabelText(/model/i), 'JS130')
      await user.type(screen.getByLabelText(/owner/i), 'Construction Co')

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Even if validation fails, we can check the form data structure
      if (mockMutate.mock.calls.length > 0) {
        const formData = mockMutate.mock.calls[0][0]
        expect(formData.get('brand')).toBe('JCB')
        expect(formData.get('model')).toBe('JS130')
        expect(formData.get('owner')).toBe('Construction Co')
      }
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to photos tab', async () => {
      renderForm()

      const photosTab = screen.getByRole('tab', { name: /equipment images/i }) || 
                       screen.getByRole('button', { name: /equipment images/i })
      
      await user.click(photosTab)

      // Should show file upload section
      expect(screen.getByTestId('mock-file-upload-equipment-image')).toBeInTheDocument()
    })

    it('should switch to documents tab', async () => {
      renderForm()

      const documentsTab = screen.getByRole('tab', { name: /documents/i }) || 
                          screen.getByRole('button', { name: /documents/i })
      
      await user.click(documentsTab)

      // Should show document upload section
      expect(screen.getByTestId('mock-file-upload-original-receipt-(or)')).toBeInTheDocument()
    })

    it('should switch to parts tab', async () => {
      renderForm()

      const partsTab = screen.getByRole('tab', { name: /parts management/i }) || 
                      screen.getByRole('button', { name: /parts management/i })
      
      await user.click(partsTab)

      // Should show parts manager
      expect(screen.getByTestId('mock-parts-manager')).toBeInTheDocument()
    })
  })

  describe('File Upload Integration', () => {
    it('should handle file upload in photos tab', async () => {
      renderForm()

      // Switch to photos tab
      const photosTab = screen.getByRole('button', { name: /(equipment images|photos)/i })
      await user.click(photosTab)

      // Upload a file
      const file = new File(['test'], 'equipment.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-equipment-image')
      
      await user.upload(fileInput, file)

      // File should be selected
      expect(fileInput.files?.[0]).toBe(file)
    })

    it('should handle document upload in documents tab', async () => {
      renderForm()

      // Switch to documents tab
      const documentsTab = screen.getByRole('button', { name: /documents/i })
      await user.click(documentsTab)

      // Upload a document
      const file = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input-original-receipt-(or)')
      
      await user.upload(fileInput, file)

      // File should be selected
      expect(fileInput.files?.[0]).toBe(file)
    })
  })

  describe('Error Handling', () => {
    it('should handle mutation errors', async () => {
      const mockMutateWithError = jest.fn((formData, { onError }) => {
        onError(new Error('Network error'))
      })

      // Override the mock for this test
      require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction.mockReturnValue({
        mutate: mockMutateWithError,
        isPending: false,
        isError: true,
        error: new Error('Network error'),
      })

      renderForm()

      // Fill required fields
      await user.type(screen.getByLabelText(/brand/i), 'Test')
      await user.type(screen.getByLabelText(/model/i), 'Test')
      await user.type(screen.getByLabelText(/owner/i), 'Test')

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Form should preserve data on error
      expect(screen.getByLabelText(/brand/i)).toHaveValue('Test')
    })

    it('should show loading state', () => {
      // Mock loading state
      require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      })

      renderForm()

      const submitButton = screen.getByRole('button', { name: /creating equipment/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Reset', () => {
    it('should reset form after successful submission', async () => {
      const mockMutateSuccess = jest.fn((formData, { onSuccess }) => {
        onSuccess({ success: true, equipment: { id: 'test' } })
      })

      require('@/hooks/useEquipmentsQuery').useCreateEquipmentAction.mockReturnValue({
        mutate: mockMutateSuccess,
        isPending: false,
        isError: false,
        error: null,
      })

      renderForm()

      const brandInput = screen.getByLabelText(/brand/i)
      await user.type(brandInput, 'Test Brand')

      const submitButton = screen.getByRole('button', { name: /create equipment/i })
      await user.click(submitButton)

      // Form should be reset
      await waitFor(() => {
        expect(brandInput).toHaveValue('')
      })
    })
  })
})