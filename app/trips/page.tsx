import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getTrips } from "@/lib/mongodb";
import styles from "./trips.module.css";

export const instant = false;

export default async function TripsPage() {
  const sessionUser = (await auth())?.user;
  if (!sessionUser?.id) redirect("/api/auth/signin");

  const trips = await getTrips();
  const userTrips = await trips
    .find({ ownerId: sessionUser.id })
    .sort({ updatedAt: -1 })
    .limit(30)
    .toArray();

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Link className={styles.brand} href="/">tripcraft</Link>
        <Link className={styles.newTrip} href="/#plan">Plan a new trip</Link>
      </div>
      <div className={styles.heading}>
        <span>YOUR TRIP COLLECTION</span>
        <h1>My trips</h1>
      </div>
      {userTrips.length === 0 ? (
        <div className={styles.empty}>
          <p>No trips yet. Your first itinerary is one short brief away.</p>
          <Link className={styles.newTrip} href="/#plan">Plan my trip</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {userTrips.map((trip) => (
            <Link className={styles.tripCard} href={`/trips/${trip._id.toHexString()}`} key={trip._id.toHexString()}>
              <span className={styles.tripMeta}>
                {trip.brief.startDate.toLocaleDateString()} · {trip.status}
              </span>
              <h2>{trip.title}</h2>
              <p>{trip.brief.cities.join(", ")}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
