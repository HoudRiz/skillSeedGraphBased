
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
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
  x?: number;
  y?: number;
}

export interface Tag {
  name: string;
  color: string;
  totalXp: number;
}

export interface NodeFormData {
  title: string;
  description: string;
  tags: string[];
  difficulty: Difficulty;
}
