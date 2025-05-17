// app/service/types.ts

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
 * Equipment model
 */
export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  expirationDate: string;
  status: Status;
  remarks?: string;
  owner: string;
  image_url?: string;
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
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: Status;
  remarks?: string;
  owner: string;
  image_url?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}
