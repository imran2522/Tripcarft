import TripPlannerForm from "@/components/TripPlannerForm";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="TripCraft home">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 22.5 22.7 6.8l2.5 2.5L9.5 25H7v-2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="m15.4 14.1 3.5 3.5M11.5 18l3.5 3.5M19.3 10.2l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>tripcraft</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#plan">Your trip</a>
          <Link href="/trips">My trips</Link>
          <Link className={styles.signIn} href="/api/auth/signin">
            Sign in <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span className={styles.sparkle} aria-hidden="true">✳</span>A little more wonder, a lot less planning</div>
          <h1>Your next trip<br />starts <span>with a feeling.</span></h1>
          <p>Tell us what you love. We&apos;ll turn it into a thoughtful, day-by-day trip that feels like yours.</p>
          <a className={styles.primaryLink} href="#plan">Plan my trip <span aria-hidden="true">↓</span></a>
        </div>
        <div className={styles.heroVisual} aria-label="A preview of a Lisbon travel itinerary">
          <div className={styles.sun} />
          <div className={styles.postcard}>
            <div className={styles.postcardImage}>
              <div className={styles.imageLabel}>LISBON, PORTUGAL</div>
              <div className={`${styles.hill} ${styles.hillBack}`} />
              <div className={`${styles.hill} ${styles.hillFront}`} />
              <div className={styles.tram}>28</div>
              <div className={styles.sunDot} />
            </div>
            <div className={styles.postcardBody}>
              <div className={styles.postcardTopline}><span>YOUR LITTLE GETAWAY</span><span className={styles.postcardStars}>✳ ✳ ✳</span></div>
              <h2>Lisbon, at your pace</h2>
              <p>3 days · food, culture & slow mornings</p>
            </div>
          </div>
          <div className={styles.floatingNote}><span aria-hidden="true">✦</span>Thoughtfully made for you</div>
        </div>
      </section>

      <section className={styles.promise} id="how-it-works">
        <div className={styles.promiseItem}><span className={styles.promiseIcon}>01</span><div><strong>You bring the feeling</strong><span>Tell us where, when, and what you love.</span></div></div>
        <span className={styles.promiseDivider} aria-hidden="true" />
        <div className={styles.promiseItem}><span className={styles.promiseIcon}>02</span><div><strong>We find your rhythm</strong><span>Get a day-by-day plan shaped around you.</span></div></div>
        <span className={styles.promiseDivider} aria-hidden="true" />
        <div className={styles.promiseItem}><span className={styles.promiseIcon}>03</span><div><strong>Make it your own</strong><span>Good trips leave room for a happy detour.</span></div></div>
      </section>

      <section className={styles.plannerSection} id="plan">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>THE FUN PART STARTS HERE</span>
          <h2>Let&apos;s make a trip of it.</h2>
          <p>A few little details are all we need to get going.</p>
        </div>
        <TripPlannerForm />
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/" aria-label="TripCraft home">tripcraft</Link>
        <span>Made for the way you want to wander.</span>
        <Link href="/trips">Your trips <span aria-hidden="true">↗</span></Link>
      </footer>
    </main>
  );
}
