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

export const getUserGraphProfile = async (userId: string): Promise<UserGraphProfile> => {
  // The backend serialises PlannerGraphContext with `omitempty`, so a user
  // with no accumulated graph data comes back as `{}`. Normalise to a
  // fully-shaped object so consumers can rely on the arrays always existing
  // (otherwise `.length`/`.map` on an undefined field crashes the page).
  const raw = await fetchClient<Partial<UserGraphProfile>>(
    `/api/v1/users/${encodeURIComponent(userId)}/graph-profile`,
  );
  return {
    user_profile: raw.user_profile ?? {},
    preferences: raw.preferences ?? [],
    recent_intents: raw.recent_intents ?? [],
    recent_decisions: raw.recent_decisions ?? [],
    current_task: raw.current_task ?? null,
    entities: raw.entities ?? [],
    relationships: raw.relationships ?? [],
    hooks: raw.hooks ?? [],
  };
};
