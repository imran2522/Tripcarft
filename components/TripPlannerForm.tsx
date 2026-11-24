"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import styles from "../app/page.module.css";

const interestOptions = [
  "Food & drink",
  "Culture",
  "Nature",
  "Architecture",
  "Shopping",
  "Nightlife",
];

const budgetOptions = [
  { value: "low", label: "Easygoing", detail: "Keep it affordable" },
  { value: "mid", label: "Balanced", detail: "A little of everything" },
  { value: "high", label: "Treat yourself", detail: "Make it memorable" },
] as const;

type GeneratedDay = {
  dayNumber: number;
  city: string;
  title: string;
  items: { name: string; description: string; time?: string }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGeneratedDay(value: unknown): value is GeneratedDay {
  return (
    isRecord(value) &&
    typeof value.dayNumber === "number" &&
    typeof value.city === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.name === "string" &&
        typeof item.description === "string" &&
        (item.time === undefined || typeof item.time === "string"),
    )
  );
}

export default function TripPlannerForm() {
  const [cities, setCities] = useState(["Lisbon"]);
  const [cityInput, setCityInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [interests, setInterests] = useState(["Food & drink", "Culture"]);
  const [budget, setBudget] = useState<"low" | "mid" | "high">("mid");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [days, setDays] = useState<GeneratedDay[] | null>(null);
  const [tripId, setTripId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addCity() {
    const city = cityInput.trim();
    if (city && !cities.some((existing) => existing.toLowerCase() === city.toLowerCase())) {
      setCities((current) => [...current, city]);
    }
    setCityInput("");
  }

  function handleCityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCity();
    }
  }

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNeedsSignIn(false);
    setDays(null);

    if (cities.length === 0) {
      setError("Add at least one destination to your trip.");
      return;
    }
    if (interests.length === 0) {
      setError("Pick at least one thing you love to do.");
      return;
    }
    if (startDate < new Date().toISOString().slice(0, 10)) {
      setError("Choose a departure date that is today or later.");
      return;
    }
    const tripLength =
      (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
      86_400_000;
    if (tripLength <= 0) {
      setError("Your return date should be after your departure date.");
      return;
    }
    if (tripLength >= 31) {
      setError("Keep your trip to 30 nights or fewer for now.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            cities,
            startDate,
            endDate,
            interests,
            budget,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          },
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "We couldn't create your trip. Please try again.";
        setError(message);
        setNeedsSignIn(response.status === 401);
        return;
      }

      if (
        !isRecord(payload) ||
        typeof payload.tripId !== "string" ||
        !Array.isArray(payload.days) ||
        !payload.days.every(isGeneratedDay)
      ) {
        throw new Error("The trip planner returned an unexpected response.");
      }

      setTripId(payload.tripId);
      setDays(payload.days);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "We couldn't reach the trip planner. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.plannerCard}>
      <div className={styles.formHeader}>
        <div>
          <span className={styles.formStep}>YOUR TRIP BRIEF <span>·</span> 01</span>
          <h3>What are you dreaming of?</h3>
        </div>
        <span className={styles.formDecor} aria-hidden="true">✳</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="city">Where do you want to go?</label>
          <div className={styles.cityInputWrap}>
            <span className={styles.inputIcon} aria-hidden="true">⌖</span>
            <input
              id="city"
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              onKeyDown={handleCityKeyDown}
              placeholder="Add a city, e.g. Kyoto"
            />
            <button className={styles.addCity} type="button" onClick={addCity} disabled={!cityInput.trim() || cities.length >= 20}>
              Add
            </button>
          </div>
          <div className={styles.chipRow}>
            {cities.map((city) => (
              <span className={styles.cityChip} key={city}>
                {city}
                <button type="button" onClick={() => setCities((current) => current.filter((item) => item !== city))} aria-label={`Remove ${city}`}>
                  ×
                </button>
              </span>
            ))}
            {cities.length === 0 && <span className={styles.helperText}>Add one or more cities to get started.</span>}
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="start-date">When are you going?</label>
            <div className={styles.dateFields}>
              <div className={styles.dateInput}>
                <span>From</span>
                <input id="start-date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>
              <span className={styles.dateArrow} aria-hidden="true">→</span>
              <div className={styles.dateInput}>
                <span>To</span>
                <input aria-label="Return date" type="date" required min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
            </div>
          </div>

          <fieldset className={`${styles.field} ${styles.interestsField}`}>
            <legend>What are you into?</legend>
            <div className={styles.interestOptions}>
              {interestOptions.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button key={interest} className={`${styles.interestChip} ${selected ? styles.selected : ""}`} type="button" aria-pressed={selected} onClick={() => toggleInterest(interest)}>
                    {selected && <span aria-hidden="true">✓</span>}
                    {interest}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <fieldset className={styles.field}>
          <legend>What feels right for your budget?</legend>
          <div className={styles.budgetOptions}>
            {budgetOptions.map((option) => (
              <button key={option.value} className={`${styles.budgetOption} ${budget === option.value ? styles.budgetSelected : ""}`} type="button" aria-pressed={budget === option.value} onClick={() => setBudget(option.value)}>
                <span className={styles.budgetRadio} aria-hidden="true" />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="notes">Anything else we should know? <span>(optional)</span></label>
          <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} placeholder="A slower pace, a little birthday surprise, your must-try food spot…" rows={3} />
        </div>

        {error && (
          <div className={styles.errorMessage} role="alert">
            <span>{error}</span>
            {needsSignIn && <Link href="/api/auth/signin">Sign in to continue <span aria-hidden="true">↗</span></Link>}
          </div>
        )}

        <div className={styles.submitRow}>
          <span className={styles.formFootnote}><span aria-hidden="true">✦</span> Your trip, your pace. No cookie-cutter plans.</span>
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Dreaming up your trip…" : "Create my trip"}
            {!isSubmitting && <span aria-hidden="true">↗</span>}
          </button>
        </div>
      </form>

      {days && (
        <section className={styles.itinerary} aria-live="polite">
          <div className={styles.itineraryHeading}>
            <div><span className={styles.sectionKicker}>YOUR NEXT CHAPTER</span><h3>Your trip is taking shape.</h3></div>
            <Link className={styles.tripReference} href={`/trips/${tripId}`}>VIEW TRIP</Link>
          </div>
          {days.map((day) => (
            <article className={styles.itineraryDay} key={day.dayNumber}>
              <span className={styles.itineraryDayNumber}>DAY {String(day.dayNumber).padStart(2, "0")}</span>
              <div className={styles.itineraryDayContent}>
                <span className={styles.itineraryCity}>{day.city}</span>
                <h4>{day.title}</h4>
                {day.items.map((item, index) => (
                  <p className={styles.itineraryItem} key={`${item.name}-${index}`}>
                    {item.time && <span>{item.time} · </span>}
                    <strong>{item.name}</strong> — {item.description}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
