/**
 * Plain domain types shared by web and (later) native clients. No framework imports.
 */
export type ClubType = "academy" | "community";

export type Session = {
  id: string;
  sportSlug: string;
  day: number; // 0 = Monday ... 6 = Sunday
  start: string; // "16:30"
  end: string;
  ageMin: number;
  ageMax: number;
  priceAed: number;
};

export type ClubSummary = {
  id: string;
  slug: string;
  name: string;
  clubType: ClubType;
  areaId: string;
  areaName: string;
  lat: number;
  lng: number;
  description: string;
  sports: string[]; // sport slugs
  sessions: Session[];
  licenceVerified: boolean;
  trialOffer: boolean;
  /** Areas in which this club holds an active Featured promotion (paid stub). */
  featuredAreaIds: string[];
  photoCount: number;
};

export type Point = { lat: number; lng: number };
