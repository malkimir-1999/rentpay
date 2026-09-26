export const inspectionAreas = [
  { key: 'exterior', label: 'Body and exterior' },
  { key: 'glass', label: 'Windows and mirrors' },
  { key: 'tires', label: 'Tyres and wheels' },
  { key: 'lights', label: 'Lights and signals' },
  { key: 'interior', label: 'Interior and seatbelts' },
  { key: 'documents', label: 'Vehicle documents' },
  { key: 'accessories', label: 'Tools and accessories' },
] as const;

export type InspectionCheck = 'OK' | 'ISSUE';
export type VehicleConditionChecklist = Record<(typeof inspectionAreas)[number]['key'], InspectionCheck>;
