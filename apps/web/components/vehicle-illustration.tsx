import styles from '../app/marketing.module.css';
export function VehicleIllustration() {
  return <svg className={styles.carSvg} viewBox="0 0 600 250" role="img" aria-label="Original illustration of a rental vehicle">
    <ellipse className={styles.carShadow} cx="300" cy="208" rx="225" ry="13" />
    <path className={styles.carBody} d="M58 167c8-19 24-31 47-39l93-25 56-55c12-12 29-18 47-18h91c23 0 42 10 58 29l40 50 43 19c15 7 24 18 26 34l3 21c1 8-5 14-13 14H55c-8 0-13-7-11-15l4-11c2-5 5-5 10-4Z" />
    <path className={styles.carWindow} d="m219 98 48-47c9-9 20-13 34-13h38v61H219Zm95-60h75c18 0 32 8 45 23l31 38H314V38Z" />
    <path className={styles.carHighlight} d="M68 165c58-21 113-28 174-28h170c48 0 95 8 143 25" />
    <path className={styles.carAccent} d="M77 174h61m328 0h43" />
    <path className={styles.carGlassLine} d="M312 41v59m57-59v59" />
    <circle className={styles.carWheel} cx="170" cy="178" r="39" /><circle className={styles.carWheelInner} cx="170" cy="178" r="22" />
    <circle className={styles.carWheel} cx="460" cy="178" r="39" /><circle className={styles.carWheelInner} cx="460" cy="178" r="22" />
    <path className={styles.carRim} d="m170 156 0 44m-22-22h44m-38-16 32 32m0-32-32 32m306-38v44m-22-22h44m-38-16 32 32m0-32-32 32" />
  </svg>;
}
