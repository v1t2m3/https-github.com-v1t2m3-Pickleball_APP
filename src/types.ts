export type TournamentStatus = 'open' | 'active' | 'completed';
export type TournamentType = 'round-robin' | 'knockout' | 'group-to-knockout';
export type MatchStatus = 'upcoming' | 'live' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  status: TournamentStatus;
  ownerId: string;
  createdAt: any;
}

export interface Participant {
  id: string;
  name: string;
  seed?: number;
}

export interface Match {
  id: string;
  p1Id: string;
  p2Id: string;
  p1Score: number;
  p2Score: number;
  status: MatchStatus;
  round: number;
  group?: string;
  startTime?: any;
  winnerId?: string;
}
