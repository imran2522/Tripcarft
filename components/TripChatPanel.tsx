"use client";

import { useState, type FormEvent } from "react";
import styles from "../app/trips/trips.module.css";

export type TripChatDay = {
  _id: string;
  dayNumber: number;
  date: string;
  city: string;
  title: string;
  items: {
    time?: string;
    name: string;
    description: string;
    category: "food" | "sight" | "activity" | "transport" | "rest";
  }[];
  notes?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DayUpdate = {
  _id: string;
  dayNumber: number;
  date: string;
  title: string;
  items: TripChatDay["items"];
  notes?: string;
  updatedAt: string;
};

export default function TripChatPanel({
  tripId,
  initialDays,
  initialChatHistory,
}: {
  tripId: string;
  initialDays: TripChatDay[];
  initialChatHistory: ChatMessage[];
}) {
  const [days, setDays] = useState(initialDays);
  const [messages, setMessages] = useState(initialChatHistory);
  const [dayNumber, setDayNumber] = useState(initialDays[0]?.dayNumber ?? 1);
  const [instruction, setInstruction] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedInstruction = instruction.trim();
    if (!trimmedInstruction) return;

    setIsSending(true);
    setError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedInstruction },
    ]);
    setInstruction("");

    try {
      const response = await fetch(`/api/trips/${tripId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, instruction: trimmedInstruction }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        setError(
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to update the itinerary day.",
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to read the trip update.");
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantReply = "";

      function processLine(line: string) {
        const payloadText = line.startsWith("data:")
          ? line.slice(5).trim()
          : line.trim();
        if (!payloadText) return;

        try {
          const payload = JSON.parse(payloadText) as
            | { type?: string; delta?: string }
            | { type: "data-day-update"; data: DayUpdate };
          if ("type" in payload && payload.type === "text-delta" && "delta" in payload) {
            const delta = payload.delta;
            if (typeof delta === "string") {
              assistantReply += delta;
              setMessages((current) => {
                const next = [...current];
                if (next.at(-1)?.role === "assistant") {
                  next[next.length - 1] = {
                    role: "assistant",
                    content: assistantReply,
                  };
                } else {
                  next.push({ role: "assistant", content: assistantReply });
                }
                return next;
              });
            }
          }
          if (
            "type" in payload &&
            payload.type === "data-day-update" &&
            "data" in payload &&
            payload.data
          ) {
            const update = payload.data;
            setDays((current) =>
              current.map((day) =>
                day.dayNumber === update.dayNumber
                  ? {
                      ...day,
                      title: update.title,
                      items: update.items,
                      notes: update.notes,
                      date: update.date,
                    }
                  : day,
              ),
            );
          }
          if ("type" in payload && payload.type === "error" && "errorText" in payload) {
            setError(String(payload.errorText));
          }
        } catch {
          // The stream can contain keep-alive comments or incomplete frames.
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(processLine);
        if (done) {
          if (buffer) processLine(buffer);
          break;
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the itinerary day.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <section className={styles.itinerary}>
        {days.map((day) => (
          <article className={styles.day} key={day._id}>
            <span className={styles.dayNumber}>
              DAY {String(day.dayNumber).padStart(2, "0")}
            </span>
            <div>
              <span className={styles.dayCity}>{day.city}</span>
              <h2>{day.title}</h2>
              {day.items.map((item, index) => (
                <p className={styles.item} key={`${item.name}-${index}`}>
                  {item.time && <span>{item.time} · </span>}
                  <strong>{item.name}</strong> — {item.description}
                </p>
              ))}
              {day.notes && <p className={styles.item}>{day.notes}</p>}
            </div>
          </article>
        ))}
      </section>

      <aside className={styles.chat}>
        <div className={styles.chatHeader}>
          <strong>Refine this trip</strong>
          <span>Ask for a change to any day.</span>
        </div>
        <div className={styles.messages} aria-live="polite">
          {messages.map((message, index) => (
            <div className={styles.message} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? "You" : "TripCraft"}: </strong>
              {message.content}
            </div>
          ))}
          {messages.length === 0 && (
            <div className={styles.message}>Try: “Add a slower morning to day two.”</div>
          )}
        </div>
        <form className={styles.chatForm} onSubmit={submitEdit}>
          <label>
            Day
            <select value={dayNumber} onChange={(event) => setDayNumber(Number(event.target.value))}>
              {days.map((day) => (
                <option value={day.dayNumber} key={day.dayNumber}>
                  Day {day.dayNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your change
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Make day 2 more relaxed…"
            />
          </label>
          {error && <span className={styles.error} role="alert">{error}</span>}
          <button className={styles.sendButton} type="submit" disabled={isSending || !instruction.trim()}>
            {isSending ? "Updating…" : "Update itinerary"}
          </button>
        </form>
      </aside>
    </>
  );
}
