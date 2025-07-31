export interface Vehicle {
  uid: string
  brand: string
  model: string
  type: string
  plateNumber: string
  inspectionDate: string
  before: number
  expiryDate: string
  registrationExpiry?: string
  status: "OPERATIONAL" | "NON_OPERATIONAL"
  remarks?: string
  owner: string
  frontImgUrl?: string
  backImgUrl?: string
  side1ImgUrl?: string
  side2ImgUrl?: string
  originalReceiptUrl?: string
  carRegistrationUrl?: string
  projectId?: string
  project?: {
    uid: string
    name: string
    client: {
      uid: string
      name: string
      location: {
        uid: string
        address: string
      }
    }
  }
  created_at: string
  updated_at: string
}

// Form types
export interface CreateVehicleData {
  brand: string
  model: string
  type: string
  plateNumber: string
  inspectionDate: string
  before: number
  expiryDate: string
  registrationExpiry?: string
  status: "OPERATIONAL" | "NON_OPERATIONAL"
  remarks?: string
  owner: string
  projectId: string
}

export interface UpdateVehicleData {
  uid: string
  brand: string
  model: string
  type: string
  plateNumber: string
  inspectionDate: string
  before: number
  expiryDate: string
  registrationExpiry?: string
  status: "OPERATIONAL" | "NON_OPERATIONAL"
  remarks?: string
  owner: string
  projectId: string
}

// File upload types
export interface VehicleFile {
  file: File
  url: string
  type: 'front' | 'back' | 'side1' | 'side2' | 'original_receipt' | 'car_registration'
}

export interface VehicleFiles {
  front?: string
  back?: string
  side1?: string
  side2?: string
  originalReceipt?: string
  carRegistration?: string
}

// Maintenance report types
export interface VehicleMaintenanceReport {
  uid: string
  vehicleId: string
  vehicle?: Vehicle
  reportDate: string
  description: string
  cost: number
  performedBy: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  attachments?: string[]
  created_at: string
  updated_at: string
}

export interface CreateMaintenanceReportData {
  vehicleId: string
  reportDate: string
  description: string
  cost: number
  performedBy: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface UpdateMaintenanceReportData {
  uid: string
  reportDate: string
  description: string
  cost: number
  performedBy: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

// API Response types
export interface VehiclesResponse {
  vehicles: Vehicle[]
  total: number
}

export interface MaintenanceReportsResponse {
  reports: VehicleMaintenanceReport[]
  total: number
}

// UI State types
export interface VehicleTableState {
  search: string
  page: number
  limit: number
  sortBy: 'brand' | 'model' | 'plateNumber' | 'status' | 'created_at'
  sortOrder: 'asc' | 'desc'
  statusFilter?: 'OPERATIONAL' | 'NON_OPERATIONAL'
  projectId?: string
}

export interface MaintenanceReportTableState {
  search: string
  page: number
  limit: number
  sortBy: 'reportDate' | 'cost' | 'status' | 'created_at'
  sortOrder: 'asc' | 'desc'
  statusFilter?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  vehicleId?: string
}