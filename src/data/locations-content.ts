// City x breed landing pages (Phase 4). Each location needs genuinely
// distinct body copy — Google penalizes near-duplicate doorway pages — so
// `intro` is hand-written per city, not generated from a template. Do not
// add a location here without writing its own intro.

export type ServiceLocation = {
  slug: string;
  city: string;
  state: "FL" | "NC";
  county: string;
  /** true for the two physical home bases (Orlando, Raeford) — pickup, not delivery. */
  isPrimary?: boolean;
  nearestBase: "Orlando, FL" | "Raeford, NC";
  driveDistanceMiles: number;
  driveTimeMinutes: number;
  /** Free delivery within ~30 miles of the nearest base; priced beyond that. */
  freeDelivery: boolean;
  intro: string;
};

export const SERVICE_LOCATIONS: readonly ServiceLocation[] = [
  {
    slug: "orlando-fl",
    city: "Orlando",
    state: "FL",
    county: "Orange",
    isPrimary: true,
    nearestBase: "Orlando, FL",
    driveDistanceMiles: 0,
    driveTimeMinutes: 0,
    freeDelivery: true,
    intro:
      "Orlando is home base — every litter is raised right here, in our own house, from the day the puppies are born. " +
      "If you're picking up locally, you're welcome to visit before you reserve, meet the parents in person, and see " +
      "exactly where your puppy has spent its first weeks. Local pickup is always free, and it's the fastest way to " +
      "bring your puppy home the same day we confirm your reservation. Most Orlando-area families come by more than " +
      "once before pickup day — once to meet the litter, and again when it's time to take their puppy home.\n\n" +
      "Because you're close, pickup day itself is usually flexible — early morning before work, a lunch break, or a " +
      "weekend afternoon all work fine, and we'll walk you through feeding schedule, vet records, and what to expect " +
      "the first few nights before you leave. Families from every part of Orange County make the trip, from Baldwin " +
      "Park and College Park down to Dr. Phillips and the tourist corridor near I-4. If it's your first puppy, we'd " +
      "rather you come see the litter in person and ask questions face to face than decide from photos alone — it's " +
      "the best way to know a Mini Goldendoodle is the right fit before you commit.\n\n" +
      "Florida's heat and humidity are worth planning around with any doodle-coated dog — we'll talk you through a " +
      "grooming routine that keeps your puppy comfortable through the summer, and what to expect coat-wise as they " +
      "grow out of the puppy fluff. If this is your first dog, or your first time with kids in the house, we're happy " +
      "to spend extra time on the basics before you take your puppy home rather than rush you out the door.\n\n" +
      "Because we're a small, family-run operation rather than a commercial kennel, the number of Mini Goldendoodle " +
      "litters we have at any given time is limited — if you have a specific color, size, or coat preference, tell us " +
      "early so we can flag you when a matching puppy comes up rather than after the litter is already spoken for.\n\n" +
      "Ready to see who's available? Reach out with your name, where in Orange County you're located, and roughly " +
      "when you're hoping to bring a puppy home, and we'll let you know which puppies currently match and when the " +
      "next visit slot opens up.",
  },
  {
    slug: "kissimmee-fl",
    city: "Kissimmee",
    state: "FL",
    county: "Osceola",
    nearestBase: "Orlando, FL",
    driveDistanceMiles: 18,
    driveTimeMinutes: 25,
    freeDelivery: true,
    intro:
      "Kissimmee families are some of our most frequent visitors — Orlando is a short drive up Highway 192, and most " +
      "pickups take well under half an hour. Whether you're near Old Town, Lake Toho, or out toward the Poinciana side " +
      "of Osceola County, we're close enough that a lot of Kissimmee buyers do an in-person meet-and-greet before they " +
      "even reserve. Delivery is free anywhere in Osceola County, though most families end up coming to us anyway just " +
      "to see the puppy's parents and littermates in person first.\n\n" +
      "A Mini Goldendoodle tends to be a great fit for the mix of full-time residents and vacation-home families we " +
      "see out of Kissimmee — they're small enough for a townhome near the 192 corridor but active enough to keep up " +
      "on a walk around Lake Toho or a weekend at one of the county parks. If you're weighing timing around a trip to " +
      "the theme parks nearby, let us know — we can usually work pickup around a travel schedule, whether that means " +
      "meeting a day before you fly out or holding a spot until you're back in town.\n\n" +
      "Central Florida's afternoon heat means we recommend keeping walks to morning or evening for the first several " +
      "months, and we'll go over that along with feeding and crate-training basics before you leave with your puppy. " +
      "Osceola County has grown a lot in the last few years, and a good number of our Kissimmee families are new to " +
      "Florida altogether — if that's you, we're happy to answer questions a longtime Floridian might not think to ask.\n\n" +
      "Short-term rentals and vacation properties are common around Kissimmee, so if you're weighing a puppy against " +
      "an HOA or rental pet policy, mention it when you reach out — we've fielded that question enough times to know " +
      "what to ask about before you fall in love with a puppy you can't actually bring home.\n\n" +
      "If you're ready to move forward, reach out with your name and roughly when you're hoping to bring a puppy " +
      "home — we'll let you know what's currently available out of Osceola County and get a free delivery or meet-up " +
      "on the calendar.",
  },
  {
    slug: "sanford-fl",
    city: "Sanford",
    state: "FL",
    county: "Seminole",
    nearestBase: "Orlando, FL",
    driveDistanceMiles: 23,
    driveTimeMinutes: 30,
    freeDelivery: true,
    intro:
      "Sanford and the rest of Seminole County sit about half an hour north of our Orlando home, an easy trip up I-4 " +
      "or the 417. We regularly deliver to Sanford, Lake Mary, and Longwood at no charge, or you're welcome to make " +
      "the short drive down to meet your puppy's parents before you commit. Seminole County families sometimes ask " +
      "about our second location in Raeford, NC too — a few Sanford buyers have family in the Carolinas and coordinate " +
      "pickup around a visit up that way.\n\n" +
      "We've delivered puppies as far out as historic downtown Sanford and out toward the Lake Monroe waterfront, and " +
      "the drive is easy enough that we can usually offer a couple of delivery windows to fit around work or school " +
      "pickup. A Mini Goldendoodle's low-shedding coat is a common draw for Seminole County families with allergies in " +
      "the house — if that's part of why you're considering the breed, we're happy to talk through what to expect coat- " +
      "and grooming-wise before you reserve, not just after.\n\n" +
      "Seminole County's mix of established neighborhoods and newer subdivisions means yard sizes vary a lot from one " +
      "Sanford street to the next — a Mini Goldendoodle does fine either way as long as it gets a daily walk, so don't " +
      "count yourself out if you're in a townhome without much of a yard. We'll ask about your living situation before " +
      "you reserve so we can flag anything worth thinking through ahead of time, not after you're already attached.\n\n" +
      "We also hear from a fair number of Sanford-area buyers who already own an older dog and are looking for a " +
      "companion — a Mini Goldendoodle's easygoing temperament generally makes for a smooth introduction, though " +
      "we'll still walk you through a proper introduction process rather than assume it'll just work itself out.\n\n" +
      "When you're ready, get in touch with your name and where in Seminole County you're located, and we'll match " +
      "you with what's currently available and set up a free delivery window or an in-person visit, whichever you'd " +
      "prefer for your Sanford household.",
  },
  {
    slug: "tampa-fl",
    city: "Tampa",
    state: "FL",
    county: "Hillsborough",
    nearestBase: "Orlando, FL",
    driveDistanceMiles: 84,
    driveTimeMinutes: 90,
    freeDelivery: false,
    intro:
      "Tampa is about an hour and a half from our Orlando home down I-4, and it's one of our most requested delivery " +
      "areas outside Orange County. Because the drive crosses county lines, delivery to Tampa, St. Petersburg, and the " +
      "rest of Hillsborough County carries a delivery fee, quoted based on your exact address when you reserve. Many " +
      "Tampa-area families choose to meet us halfway in Orlando instead, which keeps the trip free and gives you a " +
      "chance to see the whole litter — not just your puppy — before you decide.\n\n" +
      "For Tampa Bay families, that halfway meetup usually lands somewhere around Lakeland, which keeps the drive to " +
      "about 45 minutes each direction instead of the full hour and a half. It's worth doing if you can — you'll get " +
      "to see the puppy's littermates and parents side by side, which is hard to judge from photos or video alone. If " +
      "meeting halfway doesn't work with your schedule, full delivery to Tampa, Brandon, or St. Petersburg is still an " +
      "option; just ask for a quote when you reach out and we'll factor in your exact address and preferred date.\n\n" +
      "Because you won't be able to swing back by easily after pickup, we spend extra time with Tampa Bay families " +
      "going over feeding schedule, vet records, and what a realistic first week looks like before the drive home. " +
      "We're also just a phone call away afterward — if something comes up in the first few days that has you " +
      "second-guessing, call or text us before you assume the worst; most early adjustment hiccups are normal.\n\n" +
      "Traffic on I-4 can add real time to the drive depending on when you leave, so if you're coordinating delivery " +
      "or a halfway meet-up, we'll factor rush hour into the window we offer rather than leave you guessing on arrival " +
      "time.\n\n" +
      "Interested in reserving? Reach out with your name and a rough timeline, and we'll confirm which puppies match " +
      "what you're looking for and quote delivery to your Tampa Bay address, or set a date to meet halfway in " +
      "Orlando.",
  },
  {
    slug: "raeford-nc",
    city: "Raeford",
    state: "NC",
    county: "Hoke",
    isPrimary: true,
    nearestBase: "Raeford, NC",
    driveDistanceMiles: 0,
    driveTimeMinutes: 0,
    freeDelivery: true,
    intro:
      "Raeford is our second home base — this is where our North Carolina litters are born and raised, in the same " +
      "hands-on, family environment as our Orlando puppies. If you're local to Hoke County, pickup is free and you're " +
      "welcome to come by before you reserve to meet the parents and see how your puppy is being raised. We keep the " +
      "same daily handling and socialization routine here as we do in Florida, so a Raeford-born puppy grows up just " +
      "as people-ready as one raised at our Orlando home.\n\n" +
      "Hoke County families are welcome to visit more than once before pickup day — a lot of people like to come by " +
      "when the puppies first open their eyes, then again a few weeks later once personalities start to show, and " +
      "again for pickup. It's a good way to actually get a feel for which puppy in the litter matches your family's " +
      "pace before you commit to one. Pickup day itself is unhurried — we'll go over feeding, the vet records we " +
      "provide, and what a realistic first week looks like before you head home.\n\n" +
      "Raeford's more rural setting gives our North Carolina litters plenty of room to explore outside as they grow, " +
      "which is part of why we like raising puppies here as much as we do in Orlando. Hoke County winters are mild " +
      "enough that a Mini Goldendoodle's coat rarely needs special accommodation, though we'll still walk you through " +
      "a grooming routine that keeps shedding and mats under control as your puppy grows out of its puppy coat.\n\n" +
      "Because Raeford litters are born and raised on the same property where you'll pick up, you're seeing exactly " +
      "the environment your puppy came from — not a staged meeting spot. If you'd like to see the parents' living " +
      "space or ask about health testing before you commit, we'd rather show you in person than just describe it.\n\n" +
      "Ready to visit? Reach out with your name and roughly when you're hoping to bring a puppy home, and we'll let " +
      "you know who's currently available at our Hoke County home and get a visit or pickup time on the calendar.",
  },
  {
    slug: "fayetteville-nc",
    city: "Fayetteville",
    state: "NC",
    county: "Cumberland",
    nearestBase: "Raeford, NC",
    driveDistanceMiles: 13,
    driveTimeMinutes: 20,
    freeDelivery: true,
    intro:
      "Fayetteville is about 20 minutes from our Raeford home, an easy trip down Highway 401 or 210. We deliver free " +
      "anywhere in Cumberland County, including the Fort Liberty area, or you can make the short drive out to meet " +
      "your puppy's parents in person before you reserve. A lot of our Fayetteville families are military, and we're " +
      "used to working around deployment schedules and PCS timelines — tell us your dates and we'll do what we can to " +
      "line up pickup around them.\n\n" +
      "Because so many Fayetteville and Fort Liberty families relocate on short notice, we try to stay flexible on " +
      "scheduling — if you need to confirm a puppy before orders come through, or need pickup pushed a week because a " +
      "move date changed, just tell us. A Mini Goldendoodle travels well and adjusts quickly to a new home, which " +
      "makes them a popular choice for families who know a PCS move might be on the horizon in a year or two. We're " +
      "also happy to talk through what documentation you'll want on hand if a future move takes you out of state.\n\n" +
      "Cumberland County's mix of on-post and off-post housing means we see everything from small apartments to " +
      "larger homes with yards, and a Mini Goldendoodle adapts well to either as long as it gets a real walk every " +
      "day. If you're new to the area and don't yet have a vet lined up, we're glad to point Fayetteville families " +
      "toward a few we trust — it's one less thing to figure out in your first week with a new puppy.\n\n" +
      "We also work with a number of Fayetteville families placing a puppy as a gift for a spouse or family member " +
      "coming home from deployment — if that's the plan, tell us up front and we'll help coordinate timing so the " +
      "surprise lands the way you want it to.\n\n" +
      "Ready to get started? Send us your name and roughly when you're hoping to bring a puppy home — we'll confirm " +
      "what's available and set up free delivery anywhere in Cumberland County or a visit to our Raeford home.",
  },
  {
    slug: "raleigh-nc",
    city: "Raleigh",
    state: "NC",
    county: "Wake",
    nearestBase: "Raeford, NC",
    driveDistanceMiles: 92,
    driveTimeMinutes: 95,
    freeDelivery: false,
    intro:
      "Raleigh is roughly an hour and a half from our Raeford home, so delivery to Wake County — Raleigh, Cary, Apex, " +
      "and the rest of the Triangle — carries a delivery fee we'll quote based on your address. A lot of Raleigh-area " +
      "families choose to meet us in Fayetteville or Raeford instead to skip the fee and see the whole litter in " +
      "person before deciding. Either way, we coordinate pickup or delivery around your schedule, not the other way " +
      "around.\n\n" +
      "If you're coming from the Raleigh side, meeting in Fayetteville splits the drive roughly in half and still " +
      "gives you the chance to see the puppy's parents and littermates before you decide — something photos alone " +
      "can't really substitute for. A Mini Goldendoodle tends to do well in Triangle-area townhomes and apartments as " +
      "long as it gets a daily walk, so if you're weighing breeds against a smaller living space, that's worth talking " +
      "through with us directly. We'll also go over what a Wake County pickup or delivery day typically looks like " +
      "start to finish when you reach out.\n\n" +
      "A lot of Triangle-area families come to us already having researched breeds carefully, which we appreciate — " +
      "feel free to come with a list of questions about temperament, shedding, or exercise needs. If a Mini " +
      "Goldendoodle doesn't end up being the right match for your Raleigh household, we'd rather tell you that upfront " +
      "than have you find out after you've already committed.\n\n" +
      "Because the drive is long enough that a same-day round trip is a lot to ask, most Raleigh families plan pickup " +
      "or delivery around a weekend rather than a weekday. We're glad to work around that and hold a puppy a few extra " +
      "days if your schedule needs it.\n\n" +
      "If you're ready to move forward, get in touch with your name and a rough timeline — we'll confirm which " +
      "puppies are currently available and quote delivery to your Wake County address, or set a meet-up in " +
      "Fayetteville or Raeford instead, whichever works better for your Raleigh-area schedule.",
  },
] as const;

/**
 * Breed slugs available for city x breed pages. Phase 4 ships mini-goldendoodle
 * only ("start with mini-goldendoodle x all 7 locations, ship, watch, then
 * expand breeds" per the implementation plan) — add entries here to expand.
 * `dbBreed` must match the exact string stored in puppies.breed (see
 * MAIN_BREEDS in src/lib/breed-utils.ts).
 */
export type LocationBreed = {
  slug: string;
  dbBreed: string;
  displayName: string;
};

export const LOCATION_BREEDS: readonly LocationBreed[] = [
  { slug: "mini-goldendoodle", dbBreed: "Mini Goldendoodle", displayName: "Mini Goldendoodle" },
] as const;
