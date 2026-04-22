import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'Precision Pick | Sentimetrics',
  description: 'Skip the endless scrolling with Precision Pick AI.',
};

export default function PrecisionPickIntro() {
  return (
    <main className={styles.introPage}>
      {/* Exact Node Flowchart Diagram */}
      <div className={styles.flowchartImageContainer}>
        {/* We use the exact image provided by the user */}
        <img 
          src="/flowchart.png" 
          alt="Precision Pick Flowchart" 
          style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Content */}
      <div className={styles.contentSection}>
        <p className={styles.introText}>
          Skip the endless scrolling. Instantly discover the perfect smartphone tailored to your exact needs with precision pick.
        </p>

        <div className={styles.ctaWrapper}>
          <Link href="/precision-pick/wizard" className={styles.btnCta}>
            Find your top 3
          </Link>
        </div>
      </div>
    </main>
  );
}
