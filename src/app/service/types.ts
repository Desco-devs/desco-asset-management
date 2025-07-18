// File: app/service/types.ts
import { user_status } from '@prisma/client'
export type Status = "OPERATIONAL" | "NON_OPERATIONAL";

export interface User {
  uid?: string
  username?: string
  password?: string
  fullname?: string
  phone?: string | null
  permissions?: string[]
  userStatus?: string
  created_at?: string
  updated_at?: string
}

/**
 * Location model - Server response format (snake_case)
 */
export interface LocationDB {
  uid: string;
  address: string;
  created_at: string;
  updated_at: string;
}

/**
 * Location model - Client format (camelCase)
 */
export interface Location {
  uid: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client model - Server response format (snake_case)
 */
export interface ClientDB {
  uid: string;
  name: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  location: LocationDB;
  projects: ProjectDB[];
}

/**
 * Client model - Client format (camelCase)
 */
export interface Client {
  uid: string;
  name: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  location: Location;
  projects: Project[];
}

/**
 * Project model - Server response format (snake_case)
 */
export interface ProjectDB {
  uid: string;
  name: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  client?: ClientDB;
  equipments?: EquipmentDB[];
  vehicles?: VehicleDB[];
}

/**
 * Project model - Client format (camelCase)
 */
export interface Project {
  uid: string;
  name: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  equipments?: Equipment[];
  vehicles?: Vehicle[];
}

/**
 * Equipment model - Server response format (snake_case)
 */
export interface EquipmentDB {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insurance_expiration_date: string;
  status: Status;
  remarks?: string | null;
  owner: string;
  image_url?: string | null;
  inspection_date?: string | null;
  project_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Equipment model - Client format (camelCase)
 */
export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate: string;
  status: Status;
  remarks?: string | null;
  owner: string;
  imageUrl?: string | null;
  inspectionDate?: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle model - Server response format (snake_case)
 */
export interface VehicleDB {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  inspection_date: string;
  before: number;
  expiry_date: string;
  status: Status;
  remarks?: string | null;
  owner: string;
  front_img_url?: string | null;
  back_img_url?: string | null;
  side1_img_url?: string | null;
  side2_img_url?: string | null;
  project_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Vehicle model - Client format (camelCase)  
 */
export interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: Status;
  remarks?: string | null;
  owner: string;
  frontImgUrl?: string | null;
  backImgUrl?: string | null;
  side1ImgUrl?: string | null;
  side2ImgUrl?: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}