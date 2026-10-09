/**
 * Public-facing presentation of workshops: category (from the code prefix the
 * centre already uses, e.g. POT-101) and its photography. Client-safe.
 *
 * Photos are from Unsplash (free Unsplash License), stored in /public so they
 * are served and optimised locally. See README for the source pages.
 */
export type CategoryKey = "pottery" | "coding" | "fitness" | "art" | "other";

type Category = {
  key: CategoryKey;
  label: string;
  blurb: string;
  prefixes: string[];
  images: { src: string; alt: string }[];
};

export const CATEGORIES: Category[] = [
  {
    key: "pottery",
    label: "Pottery",
    blurb: "Wheel throwing, hand building and glazing.",
    prefixes: ["POT", "CER"],
    images: [
      { src: "/images/workshops/pottery.jpg", alt: "Hands shaping a clay pot on a spinning pottery wheel" },
      { src: "/images/workshops/glazing.jpg", alt: "Close-up of hands adding a handle to a textured clay pot" },
    ],
  },
  {
    key: "coding",
    label: "Coding",
    blurb: "Friendly, practical classes for complete beginners.",
    prefixes: ["CODE", "DIG", "TECH"],
    images: [{ src: "/images/workshops/coding.jpg", alt: "A group of learners gathered around a laptop" }],
  },
  {
    key: "fitness",
    label: "Fitness",
    blurb: "Strength, stretching and high-energy group sessions.",
    prefixes: ["FIT", "YOGA"],
    images: [
      { src: "/images/workshops/fitness.jpg", alt: "A group fitness class stretching with resistance bands" },
      { src: "/images/workshops/fitness-alt.jpg", alt: "An instructor leading a seated stretching class" },
    ],
  },
  {
    key: "art",
    label: "Art & craft",
    blurb: "Painting, batik and textile work.",
    prefixes: ["ART", "CRAFT"],
    images: [{ src: "/images/workshops/art.jpg", alt: "A hand mixing paint on an artist's palette" }],
  },
];

const OTHER: Category = {
  key: "other",
  label: "Workshop",
  blurb: "",
  prefixes: [],
  images: [{ src: "/images/workshops/pottery.jpg", alt: "Hands at work in a studio" }],
};

export function categoryOf(code: string): Category {
  const prefix = code.split("-")[0]?.toUpperCase() ?? "";
  return CATEGORIES.find((c) => c.prefixes.includes(prefix)) ?? OTHER;
}

/** A stable photo per workshop, varied within its category. */
export function imageFor(code: string) {
  const { images } = categoryOf(code);
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return images[hash % images.length];
}

export function durationLabel(startsAt: string, endsAt: string) {
  const mins = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} hour${h === 1 ? "" : "s"}`;
}
