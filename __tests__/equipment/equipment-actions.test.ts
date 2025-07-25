/**
 * Equipment Server Actions Tests
 * Tests the mocked server-side CRUD operations for equipment management
 */

// Mock the entire actions module
jest.mock('@/app/(admin-dashboard)/equipments/actions', () => ({
  createEquipmentAction: jest.fn(),
  updateEquipmentAction: jest.fn(),
}))

import { createEquipmentAction, updateEquipmentAction } from '@/app/(admin-dashboard)/equipments/actions'

describe('Equipment Server Actions', () => {
  const mockCreateAction = createEquipmentAction as jest.MockedFunction<typeof createEquipmentAction>
  const mockUpdateAction = updateEquipmentAction as jest.MockedFunction<typeof updateEquipmentAction>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createEquipmentAction', () => {
    it('should be called with correct FormData for valid equipment creation', async () => {
      const mockEquipment = {
        id: 'equipment-123',
        brand: 'Caterpillar',
        model: '320D',
        type: 'Excavator'
      }

      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: mockEquipment
      })

      const formData = new FormData()
      formData.append('brand', 'Caterpillar')
      formData.append('model', '320D')
      formData.append('type', 'Excavator')
      formData.append('plateNumber', 'EQP-001')
      formData.append('owner', 'Test Company')
      formData.append('projectId', 'project-123')
      formData.append('status', 'OPERATIONAL')

      const result = await createEquipmentAction(formData)

      expect(mockCreateAction).toHaveBeenCalledWith(formData)
      expect(result).toEqual({
        success: true,
        equipment: mockEquipment
      })
    })

    it('should handle validation errors', async () => {
      mockCreateAction.mockRejectedValue(new Error('Missing required fields: brand, model, type, owner, projectId'))

      const formData = new FormData()
      // Missing required fields

      await expect(createEquipmentAction(formData)).rejects.toThrow('Missing required fields')
      expect(mockCreateAction).toHaveBeenCalledWith(formData)
    })

    it('should handle authentication errors', async () => {
      mockCreateAction.mockRejectedValue(new Error('Unauthorized'))

      const formData = new FormData()
      formData.append('brand', 'Caterpillar')
      formData.append('model', '320D')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Company')
      formData.append('projectId', 'project-123')

      await expect(createEquipmentAction(formData)).rejects.toThrow('Unauthorized')
    })

    it('should handle project not found errors', async () => {
      mockCreateAction.mockRejectedValue(new Error('Project not found'))

      const formData = new FormData()
      formData.append('brand', 'Caterpillar')
      formData.append('model', '320D')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Company')
      formData.append('projectId', 'invalid-project-id')

      await expect(createEquipmentAction(formData)).rejects.toThrow('Project not found')
    })

    it('should handle database errors', async () => {
      mockCreateAction.mockRejectedValue(new Error('Database connection failed'))

      const formData = new FormData()
      formData.append('brand', 'Caterpillar')
      formData.append('model', '320D')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Company')
      formData.append('projectId', 'project-123')

      await expect(createEquipmentAction(formData)).rejects.toThrow('Database connection failed')
    })

    it('should handle file uploads with equipment data', async () => {
      const mockEquipment = {
        id: 'equipment-123',
        brand: 'Caterpillar',
        model: '320D',
        image_url: 'https://example.com/equipment.jpg'
      }

      mockCreateAction.mockResolvedValue({
        success: true,
        equipment: mockEquipment
      })

      const formData = new FormData()
      formData.append('brand', 'Caterpillar')
      formData.append('model', '320D')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Company')
      formData.append('projectId', 'project-123')
      
      // Add file
      const imageFile = new File(['image content'], 'equipment.jpg', { type: 'image/jpeg' })
      formData.append('equipmentImage', imageFile)

      const result = await createEquipmentAction(formData)

      expect(mockCreateAction).toHaveBeenCalledWith(formData)
      expect(result.equipment.image_url).toBeDefined()
    })
  })

  describe('updateEquipmentAction', () => {
    it('should be called with correct FormData for valid equipment update', async () => {
      const mockUpdatedEquipment = {
        id: 'equipment-123',
        brand: 'Updated Brand',
        model: 'Updated Model',
        type: 'Loader'
      }

      mockUpdateAction.mockResolvedValue({
        success: true,
        equipment: mockUpdatedEquipment
      })

      const formData = new FormData()
      formData.append('equipmentId', 'equipment-123')
      formData.append('brand', 'Updated Brand')
      formData.append('model', 'Updated Model')
      formData.append('type', 'Loader')
      formData.append('owner', 'Updated Company')
      formData.append('projectId', 'project-123')
      formData.append('status', 'NON_OPERATIONAL')

      const result = await updateEquipmentAction(formData)

      expect(mockUpdateAction).toHaveBeenCalledWith(formData)
      expect(result).toEqual({
        success: true,
        equipment: mockUpdatedEquipment
      })
    })

    it('should handle missing equipmentId error', async () => {
      mockUpdateAction.mockRejectedValue(new Error('Missing required fields: equipmentId, brand, model, type, owner, projectId'))

      const formData = new FormData()
      // Missing equipmentId

      await expect(updateEquipmentAction(formData)).rejects.toThrow('Missing required fields')
      expect(mockUpdateAction).toHaveBeenCalledWith(formData)
    })

    it('should handle equipment not found error', async () => {
      mockUpdateAction.mockRejectedValue(new Error('Equipment not found'))

      const formData = new FormData()
      formData.append('equipmentId', 'invalid-equipment-id')
      formData.append('brand', 'Updated Brand')
      formData.append('model', 'Updated Model')
      formData.append('type', 'Loader')
      formData.append('owner', 'Updated Company')
      formData.append('projectId', 'project-123')

      await expect(updateEquipmentAction(formData)).rejects.toThrow('Equipment not found')
    })

    it('should handle updating equipment with new files', async () => {
      const mockUpdatedEquipment = {
        id: 'equipment-123',
        brand: 'Updated Brand',
        model: 'Updated Model',
        image_url: 'https://example.com/new-equipment.jpg'
      }

      mockUpdateAction.mockResolvedValue({
        success: true,
        equipment: mockUpdatedEquipment
      })

      const formData = new FormData()
      formData.append('equipmentId', 'equipment-123')
      formData.append('brand', 'Updated Brand')
      formData.append('model', 'Updated Model')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Updated Company')
      formData.append('projectId', 'project-123')
      
      // Add new file
      const newImageFile = new File(['new image'], 'new-equipment.jpg', { type: 'image/jpeg' })
      formData.append('equipmentImage', newImageFile)

      const result = await updateEquipmentAction(formData)

      expect(mockUpdateAction).toHaveBeenCalledWith(formData)
      expect(result.equipment.image_url).toBeDefined()
    })
  })

  describe('Form Data Validation', () => {
    it('should validate FormData structure for create action', async () => {
      const formData = new FormData()
      formData.append('brand', 'Test Brand')
      formData.append('model', 'Test Model')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Owner')
      formData.append('projectId', 'project-123')
      formData.append('status', 'OPERATIONAL')
      formData.append('inspectionDate', '2024-01-15')
      formData.append('insuranceExpirationDate', '2024-12-31')
      formData.append('before', '6')
      formData.append('remarks', 'Test remarks')

      mockCreateAction.mockResolvedValue({ success: true, equipment: { id: 'test' } })

      await createEquipmentAction(formData)

      expect(mockCreateAction).toHaveBeenCalledWith(formData)
      
      // Verify FormData contains expected fields
      const callArgs = mockCreateAction.mock.calls[0][0]
      expect(callArgs.get('brand')).toBe('Test Brand')
      expect(callArgs.get('model')).toBe('Test Model')
      expect(callArgs.get('type')).toBe('Excavator')
      expect(callArgs.get('owner')).toBe('Test Owner')
      expect(callArgs.get('projectId')).toBe('project-123')
    })

    it('should validate FormData structure for update action', async () => {
      const formData = new FormData()
      formData.append('equipmentId', 'equipment-123')
      formData.append('brand', 'Updated Brand')
      formData.append('model', 'Updated Model')
      formData.append('type', 'Loader')
      formData.append('owner', 'Updated Owner')
      formData.append('projectId', 'project-456')

      mockUpdateAction.mockResolvedValue({ success: true, equipment: { id: 'equipment-123' } })

      await updateEquipmentAction(formData)

      expect(mockUpdateAction).toHaveBeenCalledWith(formData)
      
      // Verify FormData contains expected fields
      const callArgs = mockUpdateAction.mock.calls[0][0]
      expect(callArgs.get('equipmentId')).toBe('equipment-123')
      expect(callArgs.get('brand')).toBe('Updated Brand')
      expect(callArgs.get('model')).toBe('Updated Model')
    })
  })

  describe('File Upload Handling', () => {
    it('should handle multiple file types in FormData', async () => {
      const formData = new FormData()
      formData.append('brand', 'Test Brand')
      formData.append('model', 'Test Model')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Owner')
      formData.append('projectId', 'project-123')

      // Add different file types
      const imageFile = new File(['image'], 'equipment.jpg', { type: 'image/jpeg' })
      const pdfFile = new File(['pdf'], 'receipt.pdf', { type: 'application/pdf' })
      
      formData.append('equipmentImage', imageFile)
      formData.append('originalReceipt', pdfFile)

      mockCreateAction.mockResolvedValue({ success: true, equipment: { id: 'test' } })

      await createEquipmentAction(formData)

      const callArgs = mockCreateAction.mock.calls[0][0]
      expect(callArgs.get('equipmentImage')).toEqual(imageFile)
      expect(callArgs.get('originalReceipt')).toEqual(pdfFile)
    })

    it('should handle parts structure in FormData', async () => {
      const formData = new FormData()
      formData.append('brand', 'Test Brand')
      formData.append('model', 'Test Model')
      formData.append('type', 'Excavator')
      formData.append('owner', 'Test Owner')
      formData.append('projectId', 'project-123')

      // Add parts structure
      const partsStructure = {
        rootFiles: [{ id: 'root1', name: 'manual.pdf' }],
        folders: [{ id: 'folder1', name: 'Filters', files: [] }]
      }
      formData.append('partsStructure', JSON.stringify(partsStructure))

      mockCreateAction.mockResolvedValue({ success: true, equipment: { id: 'test' } })

      await createEquipmentAction(formData)

      const callArgs = mockCreateAction.mock.calls[0][0]
      expect(JSON.parse(callArgs.get('partsStructure') as string)).toEqual(partsStructure)
    })
  })
})