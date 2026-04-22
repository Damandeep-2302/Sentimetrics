'use client';

import { useState, useEffect, useRef } from 'react';
import { getRecommendations, selectTop3 } from '@/src/utils/engine.js';
import { FEATURE_CONFIG, ALL_FEATURES, phones as fallbackPhones } from '@/src/api/mobileData.js';
import styles from './page.module.css';

// ─── Wizard Step Definitions ─────────────────────────────────────────────────
const STEPS = [
  {
    id: 'basics',
    label: 'The Basics',
    title: 'Core Specifications',
    description: 'Set your ideal ranges for price and fundamental smartphone specs.',
    features: ['price', 'battery', 'screen', 'storage', 'ram'],
    tip: null,
  },
  {
    id: 'engine',
    label: 'The Engine',
    title: 'Performance Hardware',
    description: 'Configure processor speed, camera resolution, fast-charging, and connectivity.',
    features: ['processor', 'camera', 'charging', 'network'],
    tip: null,
  },
  {
    id: 'experience',
    label: 'The Experience',
    title: 'User Experience',
    description: 'Rate how much you value software, sound quality, build quality, and design aesthetics.',
    features: ['performance', 'quality', 'sound', 'design', 'software', 'build'],
    tip: null,
  },
  {
    id: 'dealbreaker',
    label: 'Dealbreaker',
    title: 'Your #1 Priority',
    description: 'Pick the single attribute that matters most. Our engine applies a 5× weight multiplier — making mismatches here far more costly.',
    features: null,
    tip: 'The <strong>Dealbreaker</strong> attribute receives a <strong style="color:#2563eb">5× weight multiplier</strong> in the Weighted Euclidean Distance formula, maximising its influence on your final results.',
  },
];

// ─── Default Preference Values ───────────────────────────────────────────────
function getDefaultPrefs() {
  const prefs = {};
  ALL_FEATURES.forEach(f => {
    const { min, max, step } = FEATURE_CONFIG[f];
    prefs[f] = Math.round((min + max) / 2 / step) * step;
  });
  return prefs;
}

// ─── Format display value by unit ────────────────────────────────────────────
function formatValue(feature, value) {
  const { unit } = FEATURE_CONFIG[feature];
  if (unit === '₹')    return `₹${value.toLocaleString('en-IN')}`;
  if (unit === 'mAh')  return `${value.toLocaleString('en-IN')} mAh`;
  if (unit === '"')   return `${parseFloat(value).toFixed(1)}"`;
  if (unit === 'GB')   return `${value} GB`;
  if (unit === 'GHz')  return `${parseFloat(value).toFixed(1)} GHz`;
  if (unit === 'MP')   return `${value} MP`;
  if (unit === 'W')    return `${value} W`;
  if (unit === '/10')  return `${value} / 10`;
  return String(value);
}

// ─── Slider Sub-component ────────────────────────────────────────────────────
function Slider({ feature, value, onChange }) {
  const cfg = FEATURE_CONFIG[feature];
  const fillPct = ((value - cfg.min) / (cfg.max - cfg.min)) * 100;

  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{cfg.label}</span>
        <span className={styles.sliderValue}>{formatValue(feature, value)}</span>
      </div>
      <div className={styles.trackWrapper}>
        <div className={styles.trackFill} style={{ width: `${fillPct}%` }} />
        <div className={styles.trackThumb} style={{ left: `${fillPct}%` }} />
        <input
          type="range"
          className={styles.rangeInput}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          aria-label={cfg.label}
          onChange={e => {
            const raw = parseFloat(e.target.value);
            const val = cfg.unit === '"'
              ? Math.round(raw / cfg.step) * cfg.step
              : parseInt(raw, 10);
            onChange(feature, val);
          }}
        />
      </div>
    </div>
  );
}

// ─── Result Card Sub-component ───────────────────────────────────────────────
function ResultCard({ item, type }) {
  const circleRef = useRef(null);
  const pctTextRef = useRef(null);

  const COLORS = {
    perfect: '#2563eb',
    budget:  '#059669',
    premium: '#7c3aed',
  };
  const LABELS = {
    perfect: 'Perfect Match',
    budget:  'Budget Pick',
    premium: 'Premium Upgrade',
  };
  const DELAYS = { perfect: 100, budget: 250, premium: 400 };

  useEffect(() => {
    const circle  = circleRef.current;
    const pctText = pctTextRef.current;
    if (!circle || !pctText) return;

    const circumference = 283;
    const targetPct = item.matchPercent;
    const targetOffset = circumference - (targetPct / 100) * circumference;

    const timer = setTimeout(() => {
      circle.style.strokeDashoffset = targetOffset;

      let current = 0;
      const duration = 1200;
      const startTime = performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        current = Math.round(eased * targetPct);
        pctText.textContent = `${current}%`;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, DELAYS[type]);

    return () => clearTimeout(timer);
  }, [item.matchPercent, type]);

  const color = COLORS[type];

  return (
    <div className={`${styles.resultCard} ${type === 'perfect' ? styles.resultFeatured : ''}`}
         style={{ '--card-accent': color }}>

      {/* Badge */}
      <span className={styles.resultBadge} style={{ color, background: `${color}18`, border: `1px solid ${color}38` }}>
        {LABELS[type]}
      </span>

      {/* Animated circle */}
      <div className={styles.circleWrap}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="55" cy="55" r="45" fill="none" stroke="#e8edf5" strokeWidth="8" />
          <circle
            ref={circleRef}
            cx="55" cy="55" r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset="283"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className={styles.circleCenter}>
          <span ref={pctTextRef} className={styles.circleValue}>0%</span>
          <span className={styles.circleLabel}>Match</span>
        </div>
      </div>

      {/* Phone info */}
      <div className={styles.resultInfo}>
        <div className={styles.resultBrand}>{item.phone.brand}</div>
        <div className={styles.resultName}>{item.phone.name}</div>
      </div>

      {/* Price */}
      <div className={styles.resultPrice}>₹{item.phone.price.toLocaleString('en-IN')}</div>

      {/* Quick specs */}
      <div className={styles.specGrid}>
        {[
          { val: `${item.phone.battery.toLocaleString()} mAh`, key: 'Battery' },
          { val: `${item.phone.camera} MP`,                    key: 'Camera'  },
          { val: `${item.phone.ram} GB`,                       key: 'RAM'     },
          { val: `${item.phone.charging} W`,                   key: 'Charging'},
        ].map(spec => (
          <div key={spec.key} className={styles.specChip}>
            <span className={styles.specVal}>{spec.val}</span>
            <span className={styles.specKey}>{spec.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function PrecisionPick() {
  const [step,        setStep]        = useState(0);
  const [prefs,       setPrefs]       = useState(getDefaultPrefs);
  const [dealbreaker, setDealbreaker] = useState(null);
  const [results,     setResults]     = useState(null);
  
  // Live data state
  const [dataset, setDataset] = useState(fallbackPhones);
  const [dataStatus, setDataStatus] = useState('loading'); // loading, live, fallback

  // Fetch live data on mount
  useEffect(() => {
    async function fetchLivePhones() {
      try {
        const res = await fetch('http://localhost:3001/api/released-phones');
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        if (data && data.length > 0) {
          setDataset(data);
          setDataStatus('live');
        } else {
          throw new Error('Empty data');
        }
      } catch (err) {
        console.error('Failed to fetch live phones, using fallback:', err);
        setDataset(fallbackPhones);
        setDataStatus('fallback');
      }
    }
    fetchLivePhones();
  }, []);

  function handlePrefChange(feature, value) {
    setPrefs(prev => ({ ...prev, [feature]: value }));
  }

  function handleFind() {
    const recs = getRecommendations(dataset, prefs, dealbreaker);
    setResults(selectTop3(recs));
    setStep(4);
  }

  function handleRestart() {
    setPrefs(getDefaultPrefs());
    setDealbreaker(null);
    setResults(null);
    setStep(0);
  }

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Dataset Status Banner */}
        <div className={`${styles.dataBanner} ${styles[dataStatus]}`}>
          <div className={styles.statusDot} />
          <span>
            {dataStatus === 'loading' && 'Connecting to smartphone database...'}
            {dataStatus === 'live' && `Live dataset active · ${dataset.length} phones`}
            {dataStatus === 'fallback' && `Offline mode · using cached dataset (${dataset.length} phones)`}
          </span>
        </div>

        {/* ── Progress Nav ─────────────────────────────────────── */}
        {step < 4 && (
          <nav className={styles.progressNav} aria-label="Wizard progress">
            {STEPS.map((s, i) => {
              const isDone   = step > i;
              const isActive = step === i;
              return (
                <div key={s.id} className={styles.stepItem}>
                  <div className={styles.stepWrapper}>
                    <div className={`${styles.stepCircle} ${isDone ? styles.done : isActive ? styles.active : ''}`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`${styles.stepLabel} ${isDone ? styles.done : isActive ? styles.active : ''}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`${styles.connector} ${isDone ? styles.done : ''}`} />
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* ── Wizard Card ──────────────────────────────────────── */}
        {step < 4 ? (
          <div className={styles.card}>

            {/* Card header */}
            <div className={styles.cardHeader}>
              <span className={styles.stepTag}>Step {step + 1} of {STEPS.length}</span>
              <h2 className={styles.cardTitle}>{currentStep.title}</h2>
              <p className={styles.cardDesc}>{currentStep.description}</p>
            </div>

            {/* Tip banner */}
            {currentStep.tip && (
              <div className={styles.tipBox}>
                <p dangerouslySetInnerHTML={{ __html: currentStep.tip }} />
              </div>
            )}

            {/* Sliders / Dealbreaker grid */}
            {currentStep.features ? (
              <div className={styles.slidersGrid}>
                {currentStep.features.map(f => (
                  <Slider key={f} feature={f} value={prefs[f]} onChange={handlePrefChange} />
                ))}
              </div>
            ) : (
              <div className={styles.dealbreakerGrid}>
                {ALL_FEATURES.map(f => {
                  const cfg = FEATURE_CONFIG[f];
                  const checked = dealbreaker === f;
                  return (
                    <label key={f} className={`${styles.dbOption} ${checked ? styles.dbChecked : ''}`}>
                      <input
                        type="radio"
                        name="dealbreaker"
                        value={f}
                        checked={checked}
                        onChange={() => setDealbreaker(f)}
                        className={styles.dbRadio}
                      />
                      <span className={styles.dbText}>{cfg.label}</span>
                      <span className={`${styles.dbCheck} ${checked ? styles.dbCheckActive : ''}`}>
                        {checked ? '✓' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Navigation buttons */}
            <div className={styles.btnRow}>
              {isFirst ? (
                <button className={styles.btnGhost} onClick={handleRestart}>↺ Reset</button>
              ) : (
                <button className={styles.btnSecondary} onClick={() => setStep(s => s - 1)}>← Back</button>
              )}

              {isLast ? (
                <button
                  className={styles.btnCta}
                  onClick={handleFind}
                  disabled={!dealbreaker}
                >
                  Find My Phone
                </button>
              ) : (
                <button className={styles.btnPrimary} onClick={() => setStep(s => s + 1)}>
                  Next Step →
                </button>
              )}
            </div>
          </div>

        ) : (
          /* ── Results ──────────────────────────────────────────── */
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Your Top Matches</h2>
              <p className={styles.resultsSub}>
                Based on your preferences
                {dealbreaker ? (
                  <> — Dealbreaker: <strong style={{ color: '#2563eb' }}>{FEATURE_CONFIG[dealbreaker].label}</strong></>
                ) : null}
              </p>
            </div>

            <div className={styles.resultsGrid}>
              <ResultCard item={results.perfect} type="perfect" />
              <ResultCard item={results.budget}  type="budget"  />
              <ResultCard item={results.premium} type="premium" />
            </div>

            <div className={styles.restartRow}>
              <button className={styles.btnSecondary} onClick={handleRestart}>← Start Over</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
