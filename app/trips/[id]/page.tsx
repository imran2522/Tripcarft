import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import TripChatPanel, { type TripChatDay } from "@/components/TripChatPanel";
import { getDestinations, getItineraryDays, getTrips } from "@/lib/mongodb";
import styles from "../trips.module.css";

export const instant = false;

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionUser = (await auth())?.user;
  if (!sessionUser?.id) redirect("/api/auth/signin");

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const tripId = new ObjectId(id);
  const trip = await (await getTrips()).findOne({
    _id: tripId,
    ownerId: sessionUser.id,
  });
  if (!trip) notFound();

  const savedDays = await (
    await getItineraryDays()
  )
    .find({ tripId, ownerId: sessionUser.id })
    .sort({ dayNumber: 1 })
    .toArray();

  const destinations = await (
    await getDestinations()
  )
    .find({ _id: { $in: [...new Set(savedDays.map((day) => day.destinationId.toHexString()))].map((value) => new ObjectId(value)) } })
    .project({ _id: 1, name: 1 })
    .toArray();
  const destinationNames = new Map(destinations.map((destination) => [destination._id.toHexString(), destination.name]));

  const days: TripChatDay[] = savedDays.map((day) => ({
    _id: day._id.toHexString(),
    dayNumber: day.dayNumber,
    date: day.date.toISOString(),
    city: destinationNames.get(day.destinationId.toHexString()) ?? trip.brief.cities[0] ?? "Destination",
    title: day.title,
    items: day.items,
    notes: day.notes,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Link className={styles.brand} href="/">tripcraft</Link>
        <Link className={styles.backLink} href="/trips">← My trips</Link>
      </div>
      <div className={styles.detailGrid}>
        <div className={styles.detailHeading}>
          <span className={styles.tripMeta}>TRIP {tripId.toHexString().slice(-6).toUpperCase()}</span>
          <h1>{trip.title}</h1>
          <p>
            {trip.brief.startDate.toLocaleDateString()} – {trip.brief.endDate.toLocaleDateString()}
            {" · "}{trip.brief.cities.join(", ")}
          </p>
        </div>
        <TripChatPanel
          tripId={tripId.toHexString()}
          initialDays={days}
          initialChatHistory={trip.chatHistory.map(({ role, content }) => ({ role, content }))}
        />
      </div>
    </main>
  );
}
