
export interface LineItem {
  id: string;
  costCode: string;
  service: string;
  description: string;
  material: number;
  labor: number;
  equipment: number;
  subContract: number;
  isCritical?: boolean;
  ownerAllowance?: boolean;
}

export interface Division {
  id: string;
  costCode: string;
  title: string;
  items: LineItem[];
}

export interface ProjectInfo {
  jobName: string;
  address: string;
  rooms: number;
  squareFeet: number;
  margin: number;
  add: number;
  description?: string;
}

export interface ProjectData {
  projectInfo: ProjectInfo;
  divisions: Division[];
  collaborators?: string[]; // Array of User IDs
}
