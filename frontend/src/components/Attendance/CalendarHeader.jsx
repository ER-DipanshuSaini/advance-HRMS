import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, List as ListIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from '../../pages/MyCalendar/MyCalendar.module.css';

export default function CalendarHeader({ 
  viewMode, 
  setViewMode, 
  monthName, 
  viewYear, 
  changeMonth, 
  isThisMonth,
  onTodayClick
}) {
  return (
    <div className={styles.calendarHeader}>
      <div className={styles.calendarHeaderLeft}>
        <h3 className={styles.calTitle}>My Calendar</h3>
        <div className={styles.viewToggle}>
          <div className={styles.toggleTrack}>
            <motion.div 
              className={styles.toggleActiveBg}
              animate={{ x: viewMode === 'calendar' ? 0 : '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleActive : ''}`} 
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays size={12}/> Calendar
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleActive : ''}`} 
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={12}/> List
            </button>
          </div>
        </div>
      </div>

      <div className={styles.monthNavGroup}>
        <button 
          className={styles.todayBtn} 
          onClick={onTodayClick}
          disabled={isThisMonth}
        >
          Today
        </button>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={() => changeMonth(-1)}>
            <ChevronLeft size={14}/>
          </button>
          <div className={styles.monthDisplay}>
            <motion.span 
              key={`${monthName}-${viewYear}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={styles.monthLabel}
            >
              {monthName} {viewYear}
            </motion.span>
          </div>
          <button 
            className={styles.navBtn} 
            onClick={() => changeMonth(1)} 
            disabled={isThisMonth}
          >
            <ChevronRight size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}
