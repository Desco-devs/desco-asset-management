// File: app/service/types.ts

/**
 * Permission flags for User
 */
export type Permission = "VIEW" | "DELETE" | "UPDATE" | "CREATE";

/**
 * Operational status for assets
 */
export type Status = "OPERATIONAL" | "NON_OPERATIONAL";

/**
 * User model returned from API
 */
export interface User {
  uid: string;
  username: string;
  fullname: string;
  phone?: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Location model
 */
export interface Location {
  uid: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client model returned from API
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
 * Project model returned from API
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
 * Equipment model
 */
export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  expirationDate: string;        // ISO date string
  status: Status;
  remarks?: string | null;
  owner: string;
  image_url?: string | null;
  inspectionDate?: string | null; // ISO date string or null
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle model
 */
export interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;        // ISO date string
  before: number;                // in months
  expiryDate: string;            // ISO date string
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
