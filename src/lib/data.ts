export type Category = { id: string; label: string; hint: string };

export const CATEGORIES: Category[] = [
  { id: "id", label: "ID card", hint: "Institute ID, other cards" },
  { id: "keys", label: "Keys", hint: "Room, cycle, bike" },
  { id: "phone", label: "Phone", hint: "" },
  { id: "laptop", label: "Laptop or tablet", hint: "" },
  { id: "audio", label: "Earphones or charger", hint: "Earbuds, cables, power bank" },
  { id: "wallet", label: "Wallet or cash", hint: "" },
  { id: "bottle", label: "Bottle", hint: "Bottle, flask, lunch box" },
  { id: "umbrella", label: "Umbrella", hint: "" },
  { id: "clothing", label: "Clothing", hint: "Jacket, blazer, cap" },
  { id: "bag", label: "Bag", hint: "" },
  { id: "books", label: "Books or notes", hint: "" },
  { id: "glasses", label: "Spectacles", hint: "" },
  { id: "watch", label: "Watch or jewellery", hint: "" },
  { id: "stationery", label: "Calculator or stationery", hint: "" },
  { id: "other", label: "Something else", hint: "" },
];

export const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Item";

export type Loc = { id: string; label: string; group: string; alt?: string };

const hostels = [
  "Alakananda", "Bhadra", "Brahmaputra", "Cauvery", "Ganga", "Godavari", "Jamuna", "Krishna",
  "Mahanadhi", "Mandakini", "Narmada", "Pampa", "Sabarmati", "Saraswathi", "Sarayu", "Sharavathi",
  "Sindhu", "Swarnamukhi", "Tamiraparani", "Tapti", "Tunga",
];

export const LOCATIONS: Loc[] = [
  { id: "doms", label: "DoMS", group: "Academic", alt: "Department of Management Studies" },
  { id: "crc", label: "CRC", group: "Academic", alt: "Class Room Complex" },
  { id: "nac", label: "NAC", group: "Academic", alt: "New Academic Complex" },
  { id: "hsb", label: "HSB", group: "Academic", alt: "Humanities and Sciences Block" },
  { id: "clt", label: "CLT", group: "Academic", alt: "Central Lecture Theatre" },
  { id: "icsr", label: "ICSR", group: "Academic", alt: "IC and SR building" },
  { id: "library", label: "Central Library", group: "Academic" },
  { id: "dept", label: "Another department building", group: "Academic" },
  ...hostels.map((h) => ({ id: "h-" + h.toLowerCase(), label: h, group: "Hostels" })),
  { id: "himalaya", label: "Himalaya mess", group: "Common areas" },
  { id: "sac", label: "SAC", group: "Common areas", alt: "Students Activity Centre" },
  { id: "oat", label: "OAT", group: "Common areas", alt: "Open Air Theatre" },
  { id: "gurunath", label: "Gurunath", group: "Common areas" },
  { id: "gymkhana", label: "Gymkhana and sports grounds", group: "Common areas" },
  { id: "hospital", label: "Institute Hospital", group: "Common areas" },
  { id: "bus", label: "Campus bus", group: "Transport and gates" },
  { id: "gc", label: "Gajendra Circle", group: "Transport and gates", alt: "GC" },
  { id: "main-gate", label: "Main Gate", group: "Transport and gates" },
  { id: "velachery-gate", label: "Velachery Gate", group: "Transport and gates" },
  { id: "taramani-gate", label: "Taramani Gate", group: "Transport and gates" },
  { id: "road", label: "On a road or pathway", group: "Transport and gates" },
  { id: "other", label: "Somewhere else", group: "Other" },
];

export const LOC_GROUPS = ["Academic", "Hostels", "Common areas", "Transport and gates", "Other"];

export const locOf = (id: string | null | undefined) => LOCATIONS.find((l) => l.id === id);
export const locLabel = (id: string | null | undefined) => locOf(id)?.label ?? "Campus";
