'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import styles from './page.module.css';

export default function Home() {
  const [featuredPhone, setFeaturedPhone]   = useState(null);
  const [phoneVisible,  setPhoneVisible]    = useState(true);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('featured_upcoming_phone', (phone) => {
      // Fade out, swap content, fade in
      setPhoneVisible(false);
      setTimeout(() => {
        setFeaturedPhone(phone);
        setPhoneVisible(true);
      }, 500);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <main className={styles.main}>

      {/* Hero Section */}
      <section className={styles.hero}>

        {/* Left — Copy */}
        <div className={styles.heroLeft}>

          <h1 className={styles.heroHeading}>
            Buying made<br />
            <span className={styles.headingAccent}>visually effortless.</span>
          </h1>

          <p className={styles.heroSubtext}>
            Skip the endless scrolling. Instantly discover the perfect smartphone
            tailored to your exact needs, and compare your top choices side-by-side
            with precision data.
          </p>

          <div className={styles.heroActions}>
            <Link href="/precision-pick" className={styles.btnPrimary}>
              Find My Phone
            </Link>
            <Link href="/compare" className={styles.btnSecondary}>
              Compare Phones
            </Link>
          </div>

          {/* Trust chips */}
          <div className={styles.trustRow}>
            {['15 Key Attributes', 'Weighted Algorithm', '10 Flagship Phones'].map(t => (
              <span key={t} className={styles.trustChip}>{t}</span>
            ))}
          </div>
        </div>

        {/* Right — Decorative UI Card */}
        <div className={styles.heroRight}>
          <div className={styles.mockCard}>

            {/* Card header */}
            <div className={styles.mockHeader}>
              <div className={styles.mockAvatar}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <div>
                <div className={styles.mockTitle}>Top Match Found</div>
                <div className={styles.mockSub}>Precision Pick · 2 sec ago</div>
              </div>
              <div className={styles.mockBadge}>New</div>
            </div>

            {/* Phone result preview */}
            <div className={styles.mockPhone}>
              <div className={styles.mockPhoneIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <div>
                <div className={styles.mockPhoneName}>Samsung Galaxy S25 Ultra</div>
                <div className={styles.mockPhoneBrand}>Samsung · Flagship 2025</div>
              </div>
              <div className={styles.mockMatch}>98%</div>
            </div>

            {/* Spec chips */}
            <div className={styles.mockSpecRow}>
              {[
                { label: 'Camera', val: '200 MP' },
                { label: 'Battery', val: '5000 mAh' },
                { label: 'Charging', val: '45 W' },
                { label: 'Storage', val: '512 GB' },
              ].map(s => (
                <div key={s.val} className={styles.mockSpec}>
                  <span className={styles.mockSpecLabel}>{s.label}</span>
                  <span className={styles.mockSpecVal}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Growth stat */}
            <div className={styles.statBubble}>
              <span className={styles.statValue}>+127%</span>
              <span className={styles.statLabel}>Match Accuracy</span>
            </div>

          </div>

          {/* Floating feature pills */}
          <div className={`${styles.floatPill} ${styles.pill1}`}>Perfect Match</div>
          <div className={`${styles.floatPill} ${styles.pill2}`}>Budget Pick found</div>
        </div>

      </section>

      {/* Feature Strip */}
      <section className={styles.featureStrip}>
        {[
          { label: 'CBF',          title: 'CBF Algorithm',       desc: 'Min-Max normalisation across 15 real attributes' },
          { label: 'WT',           title: 'Dealbreaker Weight',  desc: '5x multiplier on your most critical requirement' },
          { label: '3',            title: '3 Curated Results',   desc: 'Perfect Match, Budget Pick and Premium Upgrade' },
          { label: '<1s',          title: 'Instant Results',     desc: 'Runs entirely in-browser — zero server latency' },
        ].map(f => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIconLabel}>{f.label}</span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Upcoming Phones — Real-Time Section */}
      <section className={styles.upcomingSection}>
        <div className={styles.upcomingInner}>
          <div className={styles.upcomingMeta}>
            <span className={styles.upcomingDot} />
            <span className={styles.upcomingLabel}>Live Feed</span>
          </div>
          <h2 className={styles.upcomingSectionTitle}>Upcoming Devices</h2>
          <p className={styles.upcomingSectionSub}>
            Real-time intelligence on forthcoming flagship launches sourced from the market.
          </p>

          <div className={`${styles.upcomingCard} ${phoneVisible ? styles.phoneVisible : styles.phoneHidden}`}>
            {featuredPhone ? (
              <>
                <div className={styles.upcomingCardHeader}>
                  <span className={styles.upcomingTag}>Anticipated Release</span>
                </div>
                <div className={styles.upcomingPhoneName}>{featuredPhone.name}</div>
                <div className={styles.upcomingPhoneStatus}>{featuredPhone.status}</div>
                <div className={styles.upcomingPhonePrice}>{featuredPhone.expectedPrice}</div>
                <div className={styles.upcomingPulse} />
              </>
            ) : (
              <div className={styles.upcomingPlaceholder}>
                Connecting to real-time feed...
              </div>
            )}
          </div>
        </div>
      </section>

    </main>
  );
}
