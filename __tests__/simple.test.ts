// Simple test to verify Jest setup works
describe('Jest Setup', () => {
  it('should run basic tests', () => {
    expect(2 + 2).toBe(4)
  })

  it('should mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    const result = await promise
    expect(result).toBe('success')
  })
})

// Test equipment parts folder functionality
describe('Equipment Parts Logic', () => {
  it('should sanitize folder names', () => {
    const sanitizeFolderName = (name: string) => {
      return name.replace(/[^a-zA-Z0-9_\-\/]/g, '_')
    }

    expect(sanitizeFolderName('Filters & Parts')).toBe('Filters___Parts')
    expect(sanitizeFolderName('Engine/Oil')).toBe('Engine/Oil')
    expect(sanitizeFolderName('Valid_Name-123')).toBe('Valid_Name-123')
  })

  it('should create proper file paths', () => {
    const createFilePath = (
      projectId: string,
      equipmentId: string,
      folderPath: string,
      filename: string
    ) => {
      const sanitizedFolder = folderPath.replace(/[^a-zA-Z0-9_\-\/]/g, '_')
      return `${projectId}/${equipmentId}/${sanitizedFolder}/${filename}`
    }

    const result = createFilePath(
      'project-123',
      'equipment-456',
      'Filters',
      '1_air-filter_123456.jpg'
    )

    expect(result).toBe('project-123/equipment-456/Filters/1_air-filter_123456.jpg')
  })

  it('should handle file movement logic', () => {
    const extractFolderFromUrl = (url: string) => {
      const parts = url.split('/')
      const equipmentIndex = parts.findIndex(part => part.startsWith('equipment-'))
      if (equipmentIndex !== -1 && equipmentIndex < parts.length - 2) {
        return parts[equipmentIndex + 1]
      }
      return 'main'
    }

    const testUrl = 'https://supabase.co/storage/v1/object/public/equipments/project-123/equipment-456/Filters/file.jpg'
    expect(extractFolderFromUrl(testUrl)).toBe('Filters')
  })
})