import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from '../../pages/MyCalendar/MyCalendar.module.css';

const CAT_COLORS = {
  NATIONAL: { bg: '#fff4f4', text: '#c0392b', label: 'National' },
  FESTIVAL: { bg: '#fffbeb', text: '#d97706', label: 'Festival' },
  COMPANY:  { bg: '#f0fdf4', text: '#16a34a', label: 'Company'  },
};

export default function StatsSection({ 
  summary, 
  leaveBalance, 
  upcomingHolidays, 
  canApplyLeave,
  onApplyLeave 
}) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <motion.div 
      className={styles.sidebar}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ── LEAVE BALANCE ───────────────── */}
      <motion.div className={styles.leaveCard} variants={item}>
        <div className={styles.leaveHeader}>
          <h4 className={styles.leaveTitle}>Leave Balance</h4>
          {canApplyLeave && (
            <button className={styles.applyBtn} onClick={onApplyLeave}>
              <Plus size={11} /> Apply Leave
            </button>
          )}
        </div>

        <div className={styles.leaveGrid}>
          {leaveBalance ? Object.entries(leaveBalance).map(([code, lb]) => {
            const pct = lb.accrued > 0 ? Math.min((lb.balance / lb.accrued) * 100, 100) : 0;
            const color = code === 'CL' ? '#10b981' : code === 'PL' ? '#0f62fe' : '#f59e0b';
            const name  = code === 'CL' ? 'Casual'   : code === 'PL' ? 'Privilege' : 'Sick';
            return (
              <div
                key={code}
                className={styles.leaveItem}
                style={{ background: `${color}0d` }}
              >
                {/* big number — spans 2 rows via CSS grid */}
                <span className={styles.leaveCount} style={{ color }}>
                  {Number(lb.balance).toFixed(1)}
                </span>

                {/* right column — type label + bar */}
                <span className={styles.leaveType} style={{ color }}>
                  {name} ({code})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className={styles.leaveBar} style={{ background: `${color}20` }}>
                    <motion.div
                      className={styles.leaveBarFill}
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className={styles.leaveSubText}>
                    {Number(lb.balance).toFixed(1)} of {Number(lb.accrued).toFixed(1)} remaining
                  </span>
                </div>
              </div>
            );
          }) : (
            <>
              <div className={styles.skeletonCell} style={{ height: '64px', borderRadius: '14px' }} />
              <div className={styles.skeletonCell} style={{ height: '64px', borderRadius: '14px' }} />
              <div className={styles.skeletonCell} style={{ height: '64px', borderRadius: '14px' }} />
            </>
          )}
        </div>
      </motion.div>

      {/* ── UPCOMING HOLIDAYS ───────────── */}
      <motion.div className={styles.upcomingCard} variants={item}>
        <div className={styles.upcomingHeader}>
          <h4 className={styles.upcomingTitle}>Upcoming Holidays</h4>
          {upcomingHolidays?.length > 0 && (
            <span className={styles.upcomingCount}>{upcomingHolidays.length}</span>
          )}
        </div>

        <div className={styles.upcomingList}>
          {upcomingHolidays?.length > 0 ? upcomingHolidays.slice(0, 6).map((h, i) => {
            const d = new Date(h.date + 'T00:00:00');
            const c = CAT_COLORS[h.category] || CAT_COLORS.FESTIVAL;
            const day = d.getDate();
            const mon = d.toLocaleString('default', { month: 'short' });

            return (
              <motion.div
                key={h.id || i}
                className={styles.upcomingItem}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div
                  className={styles.upcomingDateBadge}
                  style={{ background: c.bg, color: c.text }}
                >
                  <span className={styles.upcomingDateDay}>{day}</span>
                  <span className={styles.upcomingDateMon}>{mon}</span>
                </div>
                <div className={styles.upcomingInfo}>
                  <span className={styles.upcomingName}>{h.name}</span>
                  <span className={styles.upcomingCat}>{c.label}</span>
                </div>
              </motion.div>
            );
          }) : (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>
              No upcoming holidays
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
