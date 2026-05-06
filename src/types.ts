export type PersonStatus = 'active' | 'left';
export type VehicleStatus = 'active' | 'maintenance' | 'left';
export type TeamStatus = 'base' | 'field' | 'left';
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type ExternalResourceType = 'machinery' | 'partner' | 'phone' | 'supplier';

export interface Incident {
  id?: string;
  name: string;
  location: string;
  coordinates?: string;
  status: 'active_no_resources' | 'active_combat' | 'mopping_up' | 'surveillance' | 'controlled';
  startDate: number;
  description?: string;
}

export interface Person {
  id?: string;
  name: string;
  organization: string;
  role: string;
  contact: string; // Telefone
  registrationNumber?: string; // Número de registro
  unit?: string; // Unidade
  vehiclePlate?: string; // Viatura (Placa/Prefixo)
  status: PersonStatus;
  incidentId: string;
  createdAt: number;
}

export interface Vehicle {
  id?: string;
  plate: string;
  type: string;
  organization: string;
  description: string;
  status: VehicleStatus;
  patrimony?: string;
  photos?: string[];
  incidentId: string;
  createdAt: number;
}

export interface Material {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  patrimony?: string;
  photos?: string[];
  incidentId: string;
  updatedAt: number;
}

export interface Team {
  id?: string;
  name: string;
  memberIds: string[];
  status: TeamStatus;
  currentLocation: string;
  incidentId: string;
  createdAt: number;
}

export interface MealDemand {
  id?: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  count: number;
  notes: string;
  incidentId: string;
  updatedAt: number;
}

export interface ExternalResource {
  id?: string;
  name: string;
  type: ExternalResourceType;
  contact: string;
  description: string;
  incidentId: string;
}

export interface IncidentPhoto {
  id?: string;
  url: string; // Base64 or URL
  description?: string;
  incidentId: string;
  createdAt: number;
}

export interface AppUser {
  id?: string;
  login: string;
  password: string; // In a real production app, this should be hashed.
  role: 'admin' | 'operator';
  createdAt: number;
}

export interface MapLayer {
  id?: string;
  name: string;
  data: any; // GeoJSON format
  type: 'kml' | 'manual';
  incidentId: string;
  createdAt: number;
}

export interface LogAction {
  id?: string;
  description: string;
  timestamp: number;
  category: string;
  reporterId: string;
  incidentId: string;
}
