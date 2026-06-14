export type AgentRating = {
  agentId: string;
  userId: string;
  stars: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AgentReputation = {
  agentId: string;
  averageStars: number;
  ratingCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};
