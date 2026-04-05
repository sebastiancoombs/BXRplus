export type AppRole = "bcba" | "rbt" | "parent";
export type TransactionType = "credit" | "debit";

export interface Profile {
  id: string;
  full_name: string;
  role?: AppRole | null; // legacy — role now lives per-client on client_staff
  avatar_url: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  qr_code: string;
  balance: number;
  created_at: string;
}

export interface ClientStaff {
  id: string;
  client_id: string;
  user_id: string;
  relationship: AppRole;
  created_at: string;
}

export interface Behavior {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  point_value: number;
  icon: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  point_cost: number;
  icon: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  client_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  behavior_id: string | null;
  reward_id: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  // joined
  behavior?: Behavior;
  reward?: Reward;
  creator?: Profile;
}

// Supabase generated types placeholder
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Profile> };
      clients: { Row: Client; Insert: Omit<Client, "id" | "created_at" | "balance" | "qr_code">; Update: Partial<Client> };
      client_staff: { Row: ClientStaff; Insert: Omit<ClientStaff, "id" | "created_at">; Update: Partial<ClientStaff> };
      behaviors: { Row: Behavior; Insert: Omit<Behavior, "id" | "created_at">; Update: Partial<Behavior> };
      rewards: { Row: Reward; Insert: Omit<Reward, "id" | "created_at">; Update: Partial<Reward> };
      transactions: { Row: Transaction; Insert: Omit<Transaction, "id" | "created_at">; Update: Partial<Transaction> };
    };
    Functions: {
      award_points: {
        Args: { p_client_id: string; p_behavior_id: string; p_amount: number; p_note?: string };
        Returns: Transaction;
      };
      redeem_reward: {
        Args: { p_client_id: string; p_reward_id: string; p_note?: string };
        Returns: Transaction;
      };
    };
  };
}
