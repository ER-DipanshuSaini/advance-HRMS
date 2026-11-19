import { useId } from 'react';
import styles from './Loader.module.css';

export default function Loader({ size = 'md', label }) {
  const filterId = useId();

  return (
    <span className={styles[size]} role={label ? 'status' : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}>
      <svg className={styles.liquid} viewBox="0 0 100 42" aria-hidden="true">
        <defs>
          <filter id={filterId} filterUnits="userSpaceOnUse" x="0" y="0" width="100" height="42"
            colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="2.4" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -7" />
          </filter>
        </defs>
        <g filter={'url(#' + filterId + ')'}>
          <circle cx="50" cy="21" r="13" />
          <circle className={styles.drop} cx="50" cy="21" r="8.5" />
        </g>
      </svg>
    </span>
  );
}
