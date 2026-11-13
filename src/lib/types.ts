export type Hub = {
  id: string; token: string; name: string; loc: string; place: string; hours: string; ask: string;
  hold_days: number | null; active: boolean; created_at: number;
};

export type Item = {
  id: string; category: string; title: string; details: string; found_loc: string; found_detail: string;
  found_on: string; holding: "hub" | "left" | "finder"; hub_id: string | null; left_note: string;
  photo_url: string | null; roll: string | null; hidden_detail: string; finder_name: string;
  finder_email: string; manage_token: string; status: "open" | "returned" | "hidden";
  returned_at: number | null; returned_to: string; thanks: string; lost_id: string | null;
  views: number; created_at: number;
  hub_name?: string | null; hub_place?: string | null; hub_hours?: string | null; hub_ask?: string | null; hub_hold_days?: number | null;
};

export type Lost = {
  id: string; category: string; title: string; details: string; lost_loc: string; lost_detail: string;
  lost_on: string; name: string; email: string; manage_token: string; status: "open" | "closed";
  item_id: string | null; closed_at: number | null; created_at: number;
};

export type Claim = { id: string; item_id: string; name: string; email: string; proof: string; created_at: number };
