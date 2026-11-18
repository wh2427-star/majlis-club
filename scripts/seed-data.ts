/**
 * DEMO DATA. Every club, person and number here is fictional.
 * Club names are invented; any resemblance to a real club is accidental.
 * No photographs of children: club "photos" are placeholder drawings of venues and kit.
 */
type S = [sport: string, day: number, start: string, end: string, ageMin: number, ageMax: number, price: number];

export type SeedClub = {
  slug: string;
  name: string;
  type: "academy" | "community";
  area: "arabian-ranches" | "the-meadows" | "the-springs";
  offset: [number, number]; // degrees from area centre
  description: string;
  sessions: S[];
  licence?: "verified" | "pending" | "expired";
  trial?: boolean;
  featured?: boolean;
  photos: number;
};

// Days: 0 Mon, 1 Tue, 2 Wed, 3 Thu, 4 Fri, 5 Sat, 6 Sun
export const seedClubs: SeedClub[] = [
  // Arabian Ranches (10)
  { slug: "oryx-owls-football", name: "Oryx Owls Football", type: "academy", area: "arabian-ranches", offset: [0.002, 0.001], licence: "verified", featured: true, photos: 2,
    description: "Small-sided football with a coach for every eight players. Boots and shin pads needed.",
    sessions: [["football", 0, "16:30", "17:30", 6, 12, 85], ["football", 2, "16:30", "17:30", 6, 12, 85]] },
  { slug: "ghaf-tree-swim-squad", name: "Ghaf Tree Swim Squad", type: "academy", area: "arabian-ranches", offset: [-0.004, 0.003], licence: "verified", trial: true, photos: 2,
    description: "Learn-to-swim and stroke clubs in a shaded outdoor pool. Groups by ability, not age.",
    sessions: [["swimming", 5, "09:00", "10:00", 4, 10, 110], ["swimming", 1, "17:00", "18:00", 7, 14, 110]] },
  { slug: "saluki-sprinters-rugby", name: "Saluki Sprinters Rugby", type: "community", area: "arabian-ranches", offset: [0.006, -0.002], photos: 1,
    description: "Volunteer-run tag and contact rugby. Parents help run the bar-b-q after Saturday sessions.",
    sessions: [["rugby", 5, "08:00", "09:30", 6, 13, 40]] },
  { slug: "camel-cove-cricket", name: "Camel Cove Cricket", type: "community", area: "arabian-ranches", offset: [-0.007, -0.004], photos: 0,
    description: "Soft-ball cricket for beginners and hard-ball nets for older players.",
    sessions: [["cricket", 6, "16:00", "17:30", 7, 15, 35], ["cricket", 3, "17:00", "18:30", 9, 15, 35]] },
  { slug: "dune-hoppers-gymnastics", name: "Dune Hoppers Gymnastics", type: "academy", area: "arabian-ranches", offset: [0.009, 0.006], licence: "pending", photos: 2,
    description: "Floor, beam and vault in an air-conditioned hall. Badges each term.",
    sessions: [["gymnastics", 1, "15:30", "16:30", 5, 9, 95], ["gymnastics", 3, "15:30", "16:30", 8, 13, 95]] },
  { slug: "palm-shade-tennis", name: "Palm Shade Tennis", type: "academy", area: "arabian-ranches", offset: [-0.002, 0.009], licence: "verified", photos: 1,
    description: "Red, orange and green ball tennis on floodlit courts.",
    sessions: [["tennis", 0, "17:00", "18:00", 5, 8, 90], ["tennis", 4, "16:00", "17:00", 9, 14, 100]] },
  { slug: "falcon-fields-netball", name: "Falcon Fields Netball", type: "community", area: "arabian-ranches", offset: [0.011, -0.007], photos: 1,
    description: "Friendly netball for girls and boys. Bibs provided.",
    sessions: [["netball", 2, "17:00", "18:00", 8, 14, 30]] },
  { slug: "sandstone-dojo", name: "Sandstone Dojo", type: "academy", area: "arabian-ranches", offset: [-0.010, 0.002], photos: 0,
    description: "Karate with grading every term. Focus on control, respect and fitness.",
    sessions: [["martial-arts", 0, "16:00", "17:00", 5, 12, 75], ["martial-arts", 3, "16:00", "17:00", 5, 12, 75]] },
  { slug: "ranches-rovers-basketball", name: "Rovers Hoops Club", type: "community", area: "arabian-ranches", offset: [0.004, 0.012], photos: 1,
    description: "Pick-up style basketball with a volunteer coach. Indoor court.",
    sessions: [["basketball", 1, "18:00", "19:00", 10, 16, 25]] },
  { slug: "little-gazelles-football", name: "Gazelle Kickers", type: "community", area: "arabian-ranches", offset: [-0.013, -0.008], photos: 0,
    description: "Relaxed football for younger players. No trials, everyone plays.",
    sessions: [["football", 5, "10:00", "11:00", 4, 7, 30]] },

  // The Meadows (7)
  { slug: "meadow-lark-swimming", name: "Meadow Lark Swimming", type: "academy", area: "the-meadows", offset: [0.002, -0.003], licence: "verified", photos: 2,
    description: "Competitive squad pathway and learn-to-swim. Lane groups of six.",
    sessions: [["swimming", 0, "06:00", "07:00", 9, 16, 120], ["swimming", 2, "16:00", "17:00", 5, 9, 105]] },
  { slug: "lakeside-lions-football", name: "Lakeside Lions Football", type: "academy", area: "the-meadows", offset: [-0.004, 0.004], photos: 2,
    description: "Age-group teams playing in a friendly local league.",
    sessions: [["football", 1, "17:00", "18:30", 8, 14, 95], ["football", 3, "17:00", "18:30", 8, 14, 95]] },
  { slug: "willow-bank-cricket", name: "Willow Bank Cricket", type: "community", area: "the-meadows", offset: [0.006, 0.005], photos: 1,
    description: "Parent-run cricket club. Kit available to borrow.",
    sessions: [["cricket", 5, "15:30", "17:30", 8, 16, 30]] },
  { slug: "meadows-tumble-gym", name: "Tumble Tree Gym", type: "academy", area: "the-meadows", offset: [-0.007, -0.002], photos: 1,
    description: "Recreational gymnastics and parkour basics.",
    sessions: [["gymnastics", 4, "15:00", "16:00", 6, 11, 85]] },
  { slug: "blue-heron-tennis", name: "Blue Heron Tennis", type: "academy", area: "the-meadows", offset: [0.008, -0.006], trial: true, photos: 0,
    description: "Small-group tennis with match play every other week.",
    sessions: [["tennis", 2, "17:30", "18:30", 7, 12, 95], ["tennis", 6, "09:00", "10:00", 7, 12, 95]] },
  { slug: "meadows-hawks-basketball", name: "Hawks Hoops Academy", type: "academy", area: "the-meadows", offset: [-0.003, 0.009], photos: 1,
    description: "Skills-first basketball with a game at the end of every session.",
    sessions: [["basketball", 0, "17:00", "18:00", 9, 15, 80]] },
  { slug: "meadows-netball-circle", name: "Circle Court Netball", type: "community", area: "the-meadows", offset: [0.010, 0.002], photos: 0,
    description: "Community netball, run by volunteers. Beginners welcome.",
    sessions: [["netball", 3, "16:30", "17:30", 7, 13, 20]] },

  // The Springs (7)
  { slug: "springs-strikers-football", name: "Springs Strikers Football", type: "community", area: "the-springs", offset: [0.002, 0.002], photos: 1,
    description: "Volunteer-coached football on the community pitch.",
    sessions: [["football", 2, "16:00", "17:00", 6, 10, 35], ["football", 5, "08:30", "09:30", 6, 10, 35]] },
  { slug: "coral-reef-swim", name: "Coral Reef Swim School", type: "academy", area: "the-springs", offset: [-0.003, -0.004], licence: "expired", photos: 2,
    description: "Indoor heated pool. Lessons in groups of four.",
    sessions: [["swimming", 6, "16:00", "17:00", 4, 10, 110]] },
  { slug: "springs-scrum-rugby", name: "Scrum Down Rugby", type: "academy", area: "the-springs", offset: [0.005, -0.005], licence: "verified", photos: 1,
    description: "Rugby academy with qualified coaches and a strong safety focus.",
    sessions: [["rugby", 4, "16:30", "18:00", 7, 14, 90]] },
  { slug: "jasmine-gymnastics", name: "Jasmine Gymnastics", type: "community", area: "the-springs", offset: [-0.006, 0.003], photos: 0,
    description: "Low-cost gymnastics club in the community hall.",
    sessions: [["gymnastics", 1, "16:00", "17:00", 5, 10, 45]] },
  { slug: "springs-taekwondo", name: "Rising Crane Taekwondo", type: "academy", area: "the-springs", offset: [0.007, 0.006], photos: 1,
    description: "Taekwondo classes with belt grading twice a year.",
    sessions: [["martial-arts", 1, "17:00", "18:00", 6, 14, 70], ["martial-arts", 4, "17:00", "18:00", 6, 14, 70]] },
  { slug: "springs-cricket-club", name: "Six Hit Cricket", type: "community", area: "the-springs", offset: [-0.009, -0.006], photos: 1,
    description: "Weekend cricket for all abilities.",
    sessions: [["cricket", 5, "16:00", "18:00", 8, 16, 25]] },
  { slug: "springs-hoops", name: "Lakeview Hoops", type: "community", area: "the-springs", offset: [0.011, -0.001], photos: 0,
    description: "Evening basketball run by parents.",
    sessions: [["basketball", 3, "18:00", "19:00", 11, 16, 20]] },
];

export const demoAccounts = {
  parent: { email: "parent.demo@example.com", displayName: "Demo Parent", role: "parent" as const },
  parent2: { email: "parent2.demo@example.com", displayName: "Second Demo Parent", role: "parent" as const },
  club: { email: "club.demo@example.com", displayName: "Demo Club Owner", role: "club" as const },
  admin: { email: "admin.demo@example.com", displayName: "Demo Admin", role: "parent" as const },
};

/** Club the demo club owner manages, with demand numbers above the upgrade threshold. */
export const demoOwnedClub = "oryx-owls-football";
export const demoOwnedClubQuiet = "camel-cove-cricket";

export const waitlistSeed = [
  { area: "umm-suqeim", emails: ["waiting1.demo@example.com", "waiting2.demo@example.com", "waiting3.demo@example.com"] },
  { area: "jumeirah", emails: ["waiting4.demo@example.com", "waiting5.demo@example.com"] },
];

/** Clubs counted by hand in the first cluster (coverage metric). Demo number. */
export const firstClusterIdentified = 110;

/** Placeholder venue/kit drawings used as club "photos". No people, no children. */
export function placeholderPhotoSvg(sport: string, variant: number): string {
  const grounds: Record<string, string> = {
    football: "#0A7550", rugby: "#0A7550", cricket: "#0A7550", netball: "#8CC6EE", basketball: "#F6B93B",
    swimming: "#8CC6EE", tennis: "#B5305C", gymnastics: "#F6EFE4", "martial-arts": "#F6EFE4",
  };
  const g = grounds[sport] ?? "#F6EFE4";
  const lines =
    sport === "swimming"
      ? [1, 2, 3, 4].map((i) => `<rect x="0" y="${i * 60}" width="400" height="6" fill="#FFFFFF"/>`).join("")
      : `<rect x="40" y="40" width="320" height="220" fill="none" stroke="#FFFFFF" stroke-width="6"/><circle cx="200" cy="150" r="${30 + variant * 10}" fill="none" stroke="#FFFFFF" stroke-width="6"/><line x1="200" y1="40" x2="200" y2="260" stroke="#FFFFFF" stroke-width="6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${g}"/>${lines}<rect x="0" y="262" width="400" height="38" fill="#1F2A37"/><text x="200" y="287" font-family="sans-serif" font-size="16" fill="#FFFFFF" text-anchor="middle">Placeholder image</text></svg>`;
}
