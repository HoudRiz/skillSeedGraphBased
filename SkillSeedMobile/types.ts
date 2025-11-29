
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export interface Vault {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Node {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  difficulty: Difficulty;
  xp: number;
  links: string[];
  createdAt: string;
  vaultId: string;
  x?: number;
  y?: number;
}

export interface Tag {
  name: string;
  color: string;
  totalXp: number;
  vaultId: string;
}

export interface NodeFormData {
  title: string;
  description: string;
  tags: string[];
  difficulty: Difficulty;
}
