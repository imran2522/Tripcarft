import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { embedTexts, getEmbeddingConfig } from "@/lib/ai/embed";
import type {
  Destination,
  GuideChunk,
  ItineraryDay,
  ItineraryDayItem,
  Trip,
} from "@/lib/db/types";

interface DestinationSeed {
  slug: string;
  name: string;
  country: string;
  region: string;
  summary: string;
  tags: string[];
  bestMonths: number[];
  avgDailyBudget: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  chunks: Array<{ id: string; topic: string; text: string }>;
}

const destinations: DestinationSeed[] = [
  {
    slug: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    region: "Marmara",
    summary:
      "A layered city where ferries, markets, neighbourhood cafes, and monumental architecture connect two continents.",
    tags: ["food", "history", "architecture", "markets", "coast"],
    bestMonths: [4, 5, 9, 10],
    avgDailyBudget: { low: 45, mid: 100, high: 220, currency: "TRY" },
    chunks: [
      {
        id: "istanbul-food",
        topic: "food",
        text: "For a simple Istanbul breakfast, look for a small lokanta or bakery serving simit, olives, cheese, tomatoes, and strong tea rather than relying only on hotel buffets. At lunch, a tray-service esnaf lokantası is a practical way to sample soups and vegetable dishes; point to what looks fresh if menus are unfamiliar. Fish sandwiches near the Galata Bridge are convenient, while quieter side streets often offer better value. Ask whether a listed price is per portion, and carry cash for modest bakeries and tea gardens.",
      },
      {
        id: "istanbul-sights",
        topic: "sights",
        text: "The historic peninsula rewards an early start: walk between Sultanahmet's major monuments before tour groups arrive, then pause in a shaded courtyard instead of trying to see every interior in one sweep. Modest clothing is appropriate at active religious sites, and visitors should check local opening arrangements before planning around Friday prayer. Across the water, the Galata Tower area gives a useful orientation point, but the surrounding steep lanes are more enjoyable when explored slowly. Leave time for ferry views; the crossing itself is part of the experience.",
      },
      {
        id: "istanbul-neighborhoods",
        topic: "neighborhoods",
        text: "Karakoy mixes working port streets with cafes and galleries, making it a useful base for walking uphill toward Galata. Kadikoy on the Asian side feels more residential and is especially lively around its market streets, where produce shops sit beside casual restaurants. Balat and Fener have colorful historic streets, but they are real neighborhoods rather than theme parks; keep voices low and avoid photographing residents without permission. Pick one district at a time, because steep hills and ferry crossings make a map's short distances misleading.",
      },
      {
        id: "istanbul-transport",
        topic: "transport",
        text: "Istanbul's transit card works across much of the metro, tram, bus, and ferry network, but confirm current fares and card rules at official machines when you arrive. Trams are handy for the historic center; ferries are often the calmer way to cross between European and Asian neighborhoods. Traffic can make road journeys unpredictable, so allow generous time for airport transfers and avoid scheduling a tight connection after a taxi ride. Use licensed taxis, confirm the meter is running, and keep your destination written down for busy periods.",
      },
      {
        id: "istanbul-etiquette",
        topic: "etiquette",
        text: "A warm greeting and a little patience go a long way in Istanbul's busy shops and cafes. Ask before taking close-up photographs of people, remove shoes when a host or sign indicates, and dress respectfully when entering a mosque. At meals, wait for everyone to be served when dining as a group and accept tea as a friendly offer without assuming it is a purchase obligation. Bargaining may be appropriate in some market stalls but not in ordinary grocery stores or restaurants; keep the exchange good-natured and stop if a seller declines.",
      },
      {
        id: "istanbul-planning",
        topic: "planning",
        text: "Plan Istanbul days around a few connected stops rather than crossing the city repeatedly. Morning light works well for outdoor monuments, while a covered market or museum can fill the hottest part of an afternoon. Keep a flexible buffer for ferry waits, queues, and hills, and check weekly closures before choosing a museum day. Comfortable shoes with grip are useful on polished stone and steep lanes. In spring and autumn, evenings near the water can feel cooler than expected, so bring a light layer even after a warm afternoon.",
      },
    ],
  },
  {
    slug: "cappadocia",
    name: "Cappadocia",
    country: "Turkey",
    region: "Central Anatolia",
    summary:
      "A high, dry plateau of volcanic valleys, cave architecture, small towns, and dawn balloon flights that depend on weather.",
    tags: ["landscapes", "history", "hiking", "villages", "food"],
    bestMonths: [4, 5, 9, 10],
    avgDailyBudget: { low: 55, mid: 125, high: 280, currency: "TRY" },
    chunks: [
      {
        id: "cappadocia-food",
        topic: "food",
        text: "Cappadocian meals often feature slow-cooked beans, grilled vegetables, soups, and breads that suit the region's cool evenings. Testi kebab is presented in a sealed clay pot at some restaurants; ask how long it takes and whether it is prepared to order rather than expecting a quick meal. Small village bakeries make a good stop before a walk, while town cafes are useful for tea between excursions. Menus can be geared to tour schedules, so confirm serving hours early if staying outside a larger town.",
      },
      {
        id: "cappadocia-sights",
        topic: "sights",
        text: "The open-air museum near Goreme is best visited early, when paths are cooler and the decorated rock-cut churches are less crowded. A guided visit can explain how these spaces were used without treating every carved room as interchangeable. Valley trails reveal changing layers of volcanic rock, but routes are not always clearly marked, so download an offline map and ask locally about current conditions. Balloon flights are weather-dependent and may be cancelled for safety; keep a flexible backup plan rather than making the flight the only purpose of the trip.",
      },
      {
        id: "cappadocia-neighborhoods",
        topic: "neighborhoods",
        text: "Goreme is convenient for trail access and early tour pickups, with plenty of modest restaurants clustered near the center. Uchisar rises above the plateau and has broad views, though its slopes are tiring without a vehicle. Avanos feels more connected to everyday river-town life and local pottery workshops, while Urgup offers a wider range of stays and evening dining. Choose lodging based on transport needs rather than the word cave alone; rooms vary in temperature, stairs, and accessibility, so ask specific questions before booking.",
      },
      {
        id: "cappadocia-transport",
        topic: "transport",
        text: "The region's towns and valleys are spread out, and public buses do not serve every trailhead at convenient times. Shared tours, a prearranged driver, or a rental car can make a multi-valley day easier, but avoid driving unfamiliar rural roads after dark. Confirm exactly where a tour pickup will occur and how early it begins. For independent hikes, carry water and let your accommodation know your route. Airport transfers from Kayseri or Nevsehir require planning; compare the actual arrival time with transfer schedules before choosing a flight.",
      },
      {
        id: "cappadocia-etiquette",
        topic: "etiquette",
        text: "Cappadocia's valleys and cave dwellings are both a landscape and a lived-in region. Stay on signed paths where possible, do not climb fragile formations, and never enter an apparently empty cave or courtyard without permission. In villages, ask before photographing residents, workshops, or private property. Small purchases from makers are more respectful than treating a studio as a free display, and it is fine to decline a sales offer politely. At religious or historic interiors, follow posted rules and keep voices low when other visitors are observing.",
      },
      {
        id: "cappadocia-planning",
        topic: "planning",
        text: "The plateau can be sunny in the daytime and surprisingly cold before dawn, so layers matter even in warmer months. Bring sturdy shoes, water, and sun protection for exposed trails; after rain, soft tuff paths may become slippery or muddy. Schedule a balloon flight on the first available morning of a longer stay so a weather cancellation leaves another chance. Allow time to rest between hikes because the altitude and dry air can feel tiring. Spring and autumn are comfortable seasons, but weather varies from day to day.",
      },
    ],
  },
  {
    slug: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    region: "Lisbon Metropolitan Area",
    summary:
      "A hilly Atlantic capital with tiled streets, neighborhood markets, seafood, and transit shaped by steep terrain.",
    tags: ["food", "history", "architecture", "coast", "nightlife"],
    bestMonths: [3, 4, 5, 9, 10],
    avgDailyBudget: { low: 55, mid: 125, high: 275, currency: "EUR" },
    chunks: [
      {
        id: "lisbon-food",
        topic: "food",
        text: "Lisbon's everyday food is easy to explore at lunch, when many neighborhood restaurants offer a short menu of grilled fish, soups, and daily specials. Ask what is fresh and check whether a side dish is included before ordering, since habits differ by restaurant. Pastel de nata is best enjoyed warm with coffee, but popular bakeries can have queues at peak times. For a less rushed meal, move one or two streets away from the busiest viewpoint or tram stop. Dinner often starts later than visitors from northern Europe may expect.",
      },
      {
        id: "lisbon-sights",
        topic: "sights",
        text: "Lisbon's viewpoints are rewarding, but the climb between them is part of the visit and can be steep on cobbles. Pair a hilltop stop with a nearby district instead of chasing every lookout on one afternoon. Belém's riverside monuments sit farther from the center; check local opening hours and allow time for transit and queues. Tile facades are beautiful, yet many decorate private homes, so avoid leaning on walls or entering building entrances for photographs. The riverfront is pleasant around sunset, when the light softens and the paths are cooler.",
      },
      {
        id: "lisbon-neighborhoods",
        topic: "neighborhoods",
        text: "Baixa is convenient for first-time navigation and central transit, while Chiado brings theaters, bookshops, and busy cafe streets. Alfama's lanes reward an unhurried wander but are steep and residential, so keep noise down at night. Graça has expansive views and a more local feel away from the main squares. Across the city, Campo de Ourique is a comfortable choice for food markets and ordinary daily life. There is no need to cover every district: select one hill area and one flatter riverside or central route each day.",
      },
      {
        id: "lisbon-transport",
        topic: "transport",
        text: "Lisbon's metro, buses, trams, and elevators use different routes, and the best option depends on hills and current service. Check official fare information before loading a transit card, and validate tickets as required. Historic trams can be crowded and slow, so use them for the ride itself rather than a tightly timed connection. A short map distance may involve a steep climb; elevators and funiculars can reduce effort when operating. For the airport, metro is straightforward for many stays, while a taxi or app car may be easier with heavy luggage.",
      },
      {
        id: "lisbon-etiquette",
        topic: "etiquette",
        text: "A quiet hello when entering a small shop or cafe is appreciated, and a polite obrigado or obrigada is an easy courtesy. Keep voices low in narrow residential lanes, particularly late in the evening when sound carries between buildings. Do not block doorways or tram tracks while taking photos, and ask before photographing people at work. Restaurant cover items may appear on the table without being complimentary; politely ask or leave them untouched if you do not want them. Tipping is not compulsory, though rounding up for good service is common.",
      },
      {
        id: "lisbon-planning",
        topic: "planning",
        text: "Lisbon's hills and hard pavement make supportive shoes more useful than a packed sightseeing checklist. Coastal breezes can cool evenings, while summer sun is strong on exposed viewpoints, so bring water and a light layer. Start uphill walks earlier in the day and use the flatter riverfront for an easier afternoon. If you plan a day trip, check train departure stations and return times carefully; different routes can leave from different parts of the city. Reserve popular restaurants when needed, but leave room for spontaneous neighborhood stops.",
      },
    ],
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    country: "Japan",
    region: "Kansai",
    summary:
      "A historic city of temple districts, craft streets, gardens, and seasonal food, best explored with thoughtful pacing.",
    tags: ["history", "food", "gardens", "culture", "crafts"],
    bestMonths: [3, 4, 5, 10, 11],
    avgDailyBudget: { low: 7000, mid: 16000, high: 35000, currency: "JPY" },
    chunks: [
      {
        id: "kyoto-food",
        topic: "food",
        text: "Kyoto meals range from simple noodle shops to seasonal multi-course cooking, so decide whether lunch or dinner is the occasion for a longer meal. Tofu, pickles, river fish, and vegetables appear in many local menus, but individual dishes vary with the season. At small counters, follow the ordering system shown at the entrance or ask staff for help rather than blocking the doorway. Convenience stores are useful for breakfast before an early temple visit. Reserve a special restaurant ahead and tell it about dietary restrictions clearly, since substitutions may not be easy.",
      },
      {
        id: "kyoto-sights",
        topic: "sights",
        text: "Kyoto's well-known temples and shrines are more rewarding when visited at opening time or near the end of the day, with one or two sites chosen carefully. A quiet garden is not a shortcut between attractions; pause, observe the design, and follow any photography rules. Seasonal foliage and blossoms draw large crowds, and exact peak dates change each year with weather. Do not assume a shrine and temple share the same customs; signs explain where to bow, wash hands, or avoid entry. Give yourself time to travel between districts.",
      },
      {
        id: "kyoto-neighborhoods",
        topic: "neighborhoods",
        text: "Central Kyoto around the covered shopping streets is practical for food and transit, while Higashiyama's preserved lanes are beautiful but busiest during daytime. Arashiyama sits west of the center and deserves its own half-day rather than a quick detour between eastern sites. Nishijin offers a slower look at textile history, and the area around Demachiyanagi feels more residential near the river. Choose an accommodation close to the transit mode you will use most. Late-night options can be limited in quieter districts, so check nearby dinner choices.",
      },
      {
        id: "kyoto-transport",
        topic: "transport",
        text: "Kyoto's buses reach many sightseeing areas but can be slow in traffic, especially during busy seasons. Trains and subway lines are more predictable for longer crossings; use a current route planner and check whether your destination is close to a station. Consider a transit pass only after comparing its coverage with your actual plans. Cycling is pleasant on suitable routes, but obey signals, park only in permitted places, and avoid riding through crowded temple lanes. Keep an IC card topped up and allow extra time when transferring between distant neighborhoods.",
      },
      {
        id: "kyoto-etiquette",
        topic: "etiquette",
        text: "Kyoto residents share narrow streets and bus stops with visitors, so keep sidewalks clear and avoid stopping in the middle of a lane for photos. Some private alleys and homes are not public attractions; respect signs and barriers. In temples, remove shoes where instructed, keep voices low, and do not touch objects or garden features. Ask before photographing people, especially anyone in traditional clothing who may simply be commuting. Queue neatly for buses and food counters, and carry a small bag for rubbish because public bins are not always easy to find.",
      },
      {
        id: "kyoto-planning",
        topic: "planning",
        text: "Kyoto is easiest when grouped by area: spend one day east of the river, another near central markets, and a separate outing in the west if time allows. Summer humidity and winter cold can make outdoor walks tiring, so plan indoor breaks and check seasonal hours. A compact umbrella helps during rainy spells, and comfortable shoes are essential for temple grounds. Popular sites may require timed entry or have special schedules, especially around festivals. Keep some flexibility for a garden or cafe that catches your attention rather than filling every hour.",
      },
    ],
  },
  {
    slug: "cairo",
    name: "Cairo",
    country: "Egypt",
    region: "Cairo Governorate",
    summary:
      "A dense, energetic metropolis with ancient sites nearby, layered neighborhoods, river crossings, and memorable street food.",
    tags: ["history", "food", "markets", "architecture", "river"],
    bestMonths: [10, 11, 12, 1, 2, 3],
    avgDailyBudget: { low: 35, mid: 85, high: 190, currency: "EGP" },
    chunks: [
      {
        id: "cairo-food",
        topic: "food",
        text: "Cairo's casual meals are filling and inexpensive, with koshari shops, fuul and taameya breakfast counters, and grilled dishes found across many districts. Choose busy places with a steady flow of customers and ask what is included before adding sides. Fresh juice stands are common, but use judgment about ice and water if you have a sensitive stomach. A sit-down restaurant can be a welcome pause from traffic and heat. Carry small notes for modest purchases, and remember that prices may change, so confirm the total before paying.",
      },
      {
        id: "cairo-sights",
        topic: "sights",
        text: "The Giza plateau is a substantial outing rather than a quick city-center stop; arrange transport, sun protection, and enough time for entry lines. At the Egyptian Museum or other collections, check current locations and opening details before setting out because exhibits and venues can change. Historic Islamic Cairo is best explored with a guide or clear walking route, taking time to notice courtyards and carved stonework. Ask before entering religious spaces, dress modestly, and follow photography notices. Heat and crowds reward an early start and a restful midday break.",
      },
      {
        id: "cairo-neighborhoods",
        topic: "neighborhoods",
        text: "Downtown Cairo has older commercial streets, cinemas, and cafes, while Zamalek's leafy avenues offer a slower riverside base and several cultural stops. Garden City is quieter in places, though some buildings and streets have access restrictions. Coptic Cairo is compact enough for a focused visit, but it is not representative of the whole city. Khan el-Khalili is lively and historic, yet its busiest lanes can feel intense; step aside before checking a map. Pick lodging based on likely daily journeys, because crossing Cairo can take longer than expected.",
      },
      {
        id: "cairo-transport",
        topic: "transport",
        text: "Cairo traffic is highly variable, so avoid building tight schedules around road travel and leave generous time for airport journeys. The metro is useful on certain corridors; check current routes, station exits, and car arrangements before boarding. Ride-hailing apps can simplify pickup locations, but verify the vehicle and destination in the app. For older neighborhoods, walking short sections may be more practical than asking a car to cross a congested area. Agree on a fare before an informal ride and keep your hotel address available offline.",
      },
      {
        id: "cairo-etiquette",
        topic: "etiquette",
        text: "Cairo is busy and welcoming, but visitors should be courteous about personal space and photography. Ask permission before taking portraits, especially in markets, workshops, or religious settings. Modest clothing is useful for mosques and conservative neighborhoods, and shoes may need to be removed at a prayer area. A calm, direct refusal is enough when declining a sales approach; avoid escalating a disagreement in a crowded street. Tipping is common in some service settings, so keep small change, but clarify prices in advance when a service is not clearly listed.",
      },
      {
        id: "cairo-planning",
        topic: "planning",
        text: "Cairo's distances, traffic, and heat make a realistic itinerary more useful than a long checklist. Group nearby sites, begin outdoor visits early, and leave the hottest hours for lunch or an indoor museum. Carry water, sun cover, and a small amount of local cash, and use offline maps in case mobile data fails. Friday schedules and public holidays can affect opening times and traffic, so verify them shortly before travel. If visiting the pyramids, arrange a reputable guide or clear transport plan in advance and set expectations about the length of the visit.",
      },
    ],
  },
];

function validateChunkLengths(destination: DestinationSeed): void {
  for (const chunk of destination.chunks) {
    const wordCount = chunk.text.trim().split(/\s+/).length;
    if (wordCount < 50 || wordCount > 120) {
      throw new Error(
        `${chunk.id} has ${wordCount} words; guide chunks must contain 50 to 120 words.`,
      );
    }
  }
}

async function seedDestinations(
  db: import("mongodb").Db,
  shouldEmbed: boolean,
): Promise<Map<string, ObjectId>> {
  for (const destination of destinations) {
    validateChunkLengths(destination);
  }

  const embeddings = shouldEmbed
    ? await embedTexts(
        destinations.flatMap((destination) =>
          destination.chunks.map((chunk) => chunk.text),
        ),
      )
    : undefined;
  const idsBySlug = new Map<string, ObjectId>();
  let embeddingIndex = 0;

  for (const destination of destinations) {
    const { chunks, ...destinationFields } = destination;
    const now = new Date();
    const guideChunks: GuideChunk[] = chunks.map((chunk) => {
      if (!embeddings) {
        return chunk;
      }

      return { ...chunk, embedding: embeddings[embeddingIndex++] };
    });
    const collection = db.collection<Destination>("destinations");

    await collection.updateOne(
      { slug: destination.slug },
      {
        $set: {
          ...destinationFields,
          guideChunks,
          updatedAt: now,
        },
        $setOnInsert: { _id: new ObjectId(), createdAt: now },
      },
      { upsert: true },
    );

    const saved = await collection.findOne(
      { slug: destination.slug },
      { projection: { _id: 1 } },
    );
    if (!saved) {
      throw new Error(`Failed to find seeded destination ${destination.slug}.`);
    }
    idsBySlug.set(destination.slug, saved._id);
  }

  return idsBySlug;
}

async function seedExampleTrip(
  db: import("mongodb").Db,
  destinationIds: Map<string, ObjectId>,
): Promise<number> {
  const istanbulId = destinationIds.get("istanbul");
  if (!istanbulId) {
    throw new Error("The Istanbul destination was not seeded.");
  }

  const ownerId = "seed-demo-user";
  const startDate = new Date("2027-05-10T00:00:00.000Z");
  const tripId = new ObjectId();
  const now = new Date();
  const trip = db.collection<Trip>("trips");

  await trip.updateOne(
    { "share.slug": "example-istanbul-3-days" },
    {
      $set: {
        ownerId,
        title: "Three Days in Istanbul",
        brief: {
          cities: ["Istanbul"],
          startDate,
          endDate: new Date("2027-05-12T00:00:00.000Z"),
          interests: ["history", "food", "neighborhoods"],
          budget: "mid",
          notes: "A relaxed first visit with time for ferries and local meals.",
        },
        destinationIds: [istanbulId],
        status: "generated",
        share: { enabled: true, slug: "example-istanbul-3-days" },
        chatHistory: [],
        updatedAt: now,
      },
      $setOnInsert: { _id: tripId, createdAt: now },
    },
    { upsert: true },
  );

  const savedTrip = await trip.findOne({
    "share.slug": "example-istanbul-3-days",
  });
  if (!savedTrip) {
    throw new Error("Failed to find the seeded example trip.");
  }

  const days: Array<{
    dayNumber: number;
    date: Date;
    title: string;
    items: ItineraryDayItem[];
  }> = [
    {
      dayNumber: 1,
      date: startDate,
      title: "Historic Peninsula and an Evening Ferry",
      items: [
        {
          time: "09:00",
          name: "Walk Sultanahmet's historic core",
          description:
            "Start early, visit the major outdoor landmarks, and pause for a shaded courtyard break.",
          category: "sight",
          durationMinutes: 180,
          sourceChunkIds: ["istanbul-sights"],
        },
        {
          time: "13:00",
          name: "Lunch at a neighborhood lokanta",
          description:
            "Choose a fresh soup or vegetable dish from the daily counter and ask about portion prices.",
          category: "food",
          durationMinutes: 75,
          sourceChunkIds: ["istanbul-food"],
        },
        {
          time: "17:30",
          name: "Take a public ferry across the Bosphorus",
          description:
            "Allow extra time for the crossing and enjoy the changing waterfront views.",
          category: "activity",
          durationMinutes: 90,
          sourceChunkIds: ["istanbul-transport", "istanbul-planning"],
        },
      ],
    },
    {
      dayNumber: 2,
      date: new Date("2027-05-11T00:00:00.000Z"),
      title: "Karakoy, Galata, and Kadikoy",
      items: [
        {
          time: "10:00",
          name: "Explore Karakoy and Galata",
          description:
            "Follow the uphill lanes at a relaxed pace, stopping for views and small local shops.",
          category: "sight",
          durationMinutes: 150,
          sourceChunkIds: ["istanbul-neighborhoods", "istanbul-sights"],
        },
        {
          time: "13:00",
          name: "Try a simple seafood lunch",
          description:
            "Look beyond the busiest bridge-side stalls and check the menu price before ordering.",
          category: "food",
          durationMinutes: 75,
          sourceChunkIds: ["istanbul-food"],
        },
        {
          time: "16:30",
          name: "Browse Kadikoy market streets",
          description:
            "Use the ferry for the crossing and explore the Asian-side market at an easy pace.",
          category: "activity",
          durationMinutes: 150,
          sourceChunkIds: ["istanbul-neighborhoods", "istanbul-transport"],
        },
      ],
    },
    {
      dayNumber: 3,
      date: new Date("2027-05-12T00:00:00.000Z"),
      title: "Balat Lanes and a Slow Neighborhood Morning",
      items: [
        {
          time: "09:30",
          name: "Walk through Balat and Fener",
          description:
            "Enjoy the historic streets respectfully, keeping residential doorways clear and asking before portraits.",
          category: "sight",
          durationMinutes: 150,
          sourceChunkIds: ["istanbul-neighborhoods", "istanbul-etiquette"],
        },
        {
          time: "12:30",
          name: "Have tea and lunch nearby",
          description:
            "Choose a small local cafe, take a break from the hills, and enjoy a relaxed meal.",
          category: "food",
          durationMinutes: 90,
          sourceChunkIds: ["istanbul-food", "istanbul-planning"],
        },
        {
          time: "16:00",
          name: "Leave time for a final ferry ride",
          description:
            "Keep the last afternoon flexible for transit, waterfront views, and packing before departure.",
          category: "transport",
          durationMinutes: 90,
          sourceChunkIds: ["istanbul-transport", "istanbul-etiquette"],
        },
      ],
    },
  ];

  const collection = db.collection<ItineraryDay>("itineraryDays");
  for (const day of days) {
    await collection.updateOne(
      { tripId: savedTrip._id, dayNumber: day.dayNumber },
      {
        $set: {
          tripId: savedTrip._id,
          ownerId,
          dayNumber: day.dayNumber,
          date: day.date,
          destinationId: istanbulId,
          title: day.title,
          items: day.items,
          updatedAt: now,
        },
        $setOnInsert: { _id: new ObjectId(), createdAt: now },
      },
      { upsert: true },
    );
  }

  return days.length;
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  if (!process.env.MONGODB_URI) {
    console.info("Seed skipped: MONGODB_URI is not set.");
    return;
  }

  const shouldEmbed = Boolean(process.env.OPENAI_API_KEY);
  if (shouldEmbed) {
    getEmbeddingConfig();
  } else {
    console.info(
      "OPENAI_API_KEY is not set; seeding guide chunks without embeddings. Add a key and rerun seed to enable vector search.",
    );
  }

  const { clientPromise, getDb } = await import("@/lib/mongodb");
  const db = await getDb();
  try {
    const collectionNames = ["destinations", "trips", "itineraryDays"];

    if (process.argv.includes("--reset")) {
      const existingNames = new Set(
        (await db.listCollections({}, { nameOnly: true }).toArray()).map(
          (collection) => collection.name,
        ),
      );
      for (const name of collectionNames) {
        if (existingNames.has(name)) {
          await db.dropCollection(name);
        }
      }
    }

    const { ensureCollections } = await import("@/lib/db/setup");
    const setupSummary = await ensureCollections(db);
    const destinationIds = await seedDestinations(db, shouldEmbed);
    const itineraryDaysSeeded = await seedExampleTrip(db, destinationIds);

    console.info("TripCraft seed complete.");
    console.info(
      `Collections created: ${setupSummary.collectionsCreated.join(", ") || "none (already existed)"}`,
    );
    console.info(
      `Indexes created: ${setupSummary.indexesCreated.join(", ") || "none (already existed)"}`,
    );
    console.info(
      `Documents seeded: ${destinations.length} destinations, 1 trip, ${itineraryDaysSeeded} itinerary days.`,
    );
    console.info(
      `Embeddings: ${shouldEmbed ? "generated" : "skipped; vector search is unavailable until embeddings are added"}.`,
    );
    console.info(
      "Manual step: create the Atlas Vector Search index using docs/atlas-vector-index.json.",
    );
  } finally {
    await (await clientPromise).close();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Seed failed:",
    error instanceof Error ? error.message : "Unknown error.",
  );
  process.exitCode = 1;
});
