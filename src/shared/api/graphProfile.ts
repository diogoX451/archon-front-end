import { fetchClient } from "./client";

export interface GraphProfilePreference {
  key: string;
  value: string;
  domain: string;
}

export interface GraphProfileIntent {
  name: string;
  confidence: number;
}

export interface GraphProfileDecision {
  text: string;
  domain: string;
}

export interface GraphProfileTask {
  name: string;
  status: string;
}

export interface UserGraphProfile {
  user_profile: {
    name?: string;
    tech_level?: string;
    tone?: string;
    journey_stage?: string;
    [key: string]: any;
  };
  preferences: GraphProfilePreference[];
  recent_intents: GraphProfileIntent[];
  recent_decisions: GraphProfileDecision[];
  current_task: GraphProfileTask | null;
  entities: any[];
  relationships: any[];
  hooks: string[];
}

export const getUserGraphProfile = (userId: string) =>
  fetchClient<UserGraphProfile>(`/api/v1/users/${encodeURIComponent(userId)}/graph-profile`);
