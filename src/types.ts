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
  banner_url?: string;
  poster_url?: string;
  start_time?: string;
  location?: string;
  max_participants?: number;
  match_type?: string;
  scoring_format?: string;
  format?: string;
}

export interface Participant {
  id: string;
  name: string;
  seed?: number;
}

export interface Match {
  id: number;
  tournament_id: number;
  group_id?: number;
  court?: string;
  round: string;
  status: MatchStatus;
  is_third_place: boolean;
  team1_id: number;
  team2_id: number;
  team1_name?: string;
  team2_name?: string;
  score_team1: number;
  score_team2: number;
  referee_id?: number;
  referee_name?: string;
  serving_team_id?: number;
  server_number?: number;
  updated_at?: any;
  group_name?: string;
}
