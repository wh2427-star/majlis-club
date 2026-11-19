/**
 * Plain domain types shared by web and (later) native clients. No framework imports.
 */
import type { PricePlan } from "./pricing";

export type ClubType = "academy" | "community";

/** Where a club trains. A club can have several. */
export type Venue = { id: string; name: string; areaId: string; areaName: string; lat: number; lng: number };

/** An age group at one venue, with its own prices (empty: the club-wide prices apply). */
export type Group = { id: string; venueId: string; name: string; ageMin: number; ageMax: number; plans: PricePlan[] };

export type Session = {
  id: string;
  sportSlug: string;
  day: number; // 0 = Monday ... 6 = Sunday
  start: string; // "16:30"
  end: string;
  ageMin: number;
  ageMax: number;
  venueId: string;
  groupId: string;
  trialAvailable: boolean;
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
  venues: Venue[];
  groups: Group[];
  /** Club-wide prices, used by any group without its own. */
  pricePlans: PricePlan[];
};

export type Point = { lat: number; lng: number };
