import React, { useState, useEffect, useRef, Fragment } from 'react';
import {
  Clock, LogIn, LogOut, CheckCircle2, X,
  XCircle, Timer, TrendingUp, BarChart2,
  List as ListIcon, CalendarDays, Plus, Palmtree, Gift, FileText,
  Calendar, Flag, Crown, PartyPopper
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../../components/common/Badge/Badge';
import Toast from '../../components/common/Toast/Toast';
import { useApi } from '../../hooks/useApi';
import styles from './MyCalendar.module.css';

// Modular Components
import CalendarHeader from '../../components/Attendance/CalendarHeader';
import StatsSection from '../../components/Attendance/StatsSection';

/* ── CONSTANTS ──────────────────────────────────────────── */
const STATUS_MAP = {
  PRESENT: { label: 'Present', variant: 'success', bg: 'bgPresent', tag: 'tagPresent' },
  HALF_DAY: { label: 'Half Day', variant: 'warning', bg: 'bgHalfDay', tag: 'tagHalfDay' },
  ABSENT: { label: 'Absent', variant: 'error', bg: 'bgAbsent', tag: 'tagAbsent' },
  HOLIDAY: { label: 'Holiday', variant: 'primary', bg: 'bgHoliday', tag: 'tagHoliday' },
  LEAVE: { label: 'On Leave', variant: 'warning', bg: 'bgLeave', tag: 'tagLeave' },
};

const LEAVE_TYPES_MAP = {
  CL: { label: 'Casual Leave', color: '#10b981' },
  PL: { label: 'Privilege Leave', color: '#0f62fe' },
  SL: { label: 'Sick Leave', color: '#f59e0b' },
};

function pad(n) { return String(n).padStart(2, '0'); }

function formatElapsed(seconds) {
  const sTotal = Math.floor(seconds);
  const h = Math.floor(sTotal / 3600);
  const m = Math.floor((sTotal % 3600) / 60);
  const s = sTotal % 60;
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + Math.floor(parts[2] || 0);
}

function nowInSeconds() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function formatDuration(decimalHours) {
  if (!decimalHours) return null;
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDurationLong(decimalHours) {
  if (!decimalHours) return null;
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes} Min`;
  if (minutes === 0) return `${hours} Hours`;
  return `${hours} Hours ${minutes} Min`;
}

/** 
 * MAIN COMPONENT: MyCalendar
 */
export default function MyCalendar() {
  const sessionUser = JSON.parse(localStorage.getItem('hireflow_user') || '{}');
  const userPermsList = Array.isArray(sessionUser?.permissions) ? sessionUser.permissions : 
                       (Array.isArray(sessionUser?.role?.permissions) ? sessionUser.role.permissions.map(p => p.code || p) : []);
  const canApplyLeave = userPermsList.includes('leaves:apply_own') || userPermsList.includes('leaves:add_all') || sessionUser.is_superuser;

  const { loading: todayLoading, request: fetchToday } = useApi();
  const { loading: actionLoading, request: doAction } = useApi();
  const { loading: histLoading, request: fetchHistory } = useApi();
  const { loading: holidayLoading, request: fetchHolidays } = useApi();
  const { loading: sumLoading, request: fetchSummary } = useApi();

  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');

  // Drawers
  const [drawerType, setDrawerType] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // Leave form state 
  const [leaveForm, setLeaveForm] = useState({ type: 'CL', from: '', to: '', reason: '' });
  const [formErrors, setFormErrors] = useState({});

  // Month navigation
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const timerRef = useRef(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (todayRecord?.check_in && !todayRecord?.check_out) {
      const checkInSec = parseTimeToSeconds(todayRecord.check_in);
      timerRef.current = setInterval(() => { setElapsed(nowInSeconds() - checkInSec); }, 1000);
    } else if (todayRecord?.check_in && todayRecord?.check_out) {
      setElapsed(parseTimeToSeconds(todayRecord.check_out) - parseTimeToSeconds(todayRecord.check_in));
    } else { setElapsed(0); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [todayRecord]);

  const loadToday = async () => { try { setTodayRecord(await fetchToday('/attendance/records/today/')); } catch { } };

  const loadHistory = async (start, end) => {
    try {
      const d = await fetchHistory(`/attendance/records/?start_date=${start}&end_date=${end}`);
      setHistory(Array.isArray(d) ? d : (d?.results || []));
    } catch { }
  };

  const loadHolidays = async (start, end) => {
    try {
      const d = await fetchHolidays(`/attendance/holidays/?start_date=${start}&end_date=${end}`);
      setHolidays(Array.isArray(d) ? d : (d?.results || []));

      const upcoming = await fetchHolidays(`/attendance/holidays/?upcoming=true`);
      setUpcomingHolidays(Array.isArray(upcoming) ? upcoming : (upcoming?.results || []));
    } catch { }
  };

  const loadLeaves = async () => {
    try {
      const b = await doAction('/attendance/leaves/balance/', { method: 'GET' });
      setLeaveBalance(b);

      const l = await doAction('/attendance/leaves/', { method: 'GET' });
      setLeaves(Array.isArray(l) ? l : (l?.results || []));
    } catch { }
  };

  const loadSummary = async (m, y) => {
    try { setSummary(await fetchSummary(`/attendance/records/summary/?month=${m}&year=${y}`)); } catch { }
  };

  useEffect(() => { loadToday(); }, []);

  useEffect(() => {
    const fDay = new Date(viewYear, viewMonth - 1, 1).getDay();
    const startObj = new Date(viewYear, viewMonth - 1, 1 - fDay);
    const endObj = new Date(viewYear, viewMonth - 1, 42 - fDay);

    // ISO date strings are YYYY-MM-DD
    const sStr = `${startObj.getFullYear()}-${pad(startObj.getMonth() + 1)}-${pad(startObj.getDate())}`;
    const eStr = `${endObj.getFullYear()}-${pad(endObj.getMonth() + 1)}-${pad(endObj.getDate())}`;

    loadHistory(sStr, eStr);
    loadHolidays(sStr, eStr);
    loadLeaves();
    loadSummary(viewMonth, viewYear);
  }, [viewMonth, viewYear]);

  const handleCheckIn = async () => {
    try {
      const data = await doAction('/attendance/records/check-in/', { method: 'POST', body: JSON.stringify({}) });
      setTodayRecord(data);
      setToast({ message: 'Checked in successfully!', type: 'success' });
      loadHistory(viewMonth, viewYear); loadSummary(viewMonth, viewYear);
    } catch (e) { setToast({ message: e.message || 'Check-in failed.', type: 'error' }); }
  };

  const handleCheckOut = async () => {
    try {
      const data = await doAction('/attendance/records/check-out/', { method: 'POST', body: JSON.stringify({}) });
      setTodayRecord(data);
      setToast({ message: 'Checked out successfully!', type: 'success' });
      loadHistory(viewMonth, viewYear); loadSummary(viewMonth, viewYear);
    } catch (e) { setToast({ message: e.message || 'Check-out failed.', type: 'error' }); }
  };

  const changeMonth = (offset) => {
    let m = viewMonth + offset, y = viewYear;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setViewMonth(m); setViewYear(y);
  };

  const resetToToday = () => {
    setViewMonth(now.getMonth() + 1);
    setViewYear(now.getFullYear());
  };

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });
  const isThisMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
  const checkedIn = !!todayRecord?.check_in;
  const checkedOut = !!todayRecord?.check_out;
  const liveStatus = !checkedIn ? 'NOT_IN' : !checkedOut ? 'WORKING' : 'DONE';
  const displayName = sessionUser.first_name || sessionUser.name || 'User';

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();

  const handleDayClick = (dayNum, rec, holiday) => {
    setSelectedDay({ dayNum, rec, holiday, date: `${viewYear}-${pad(viewMonth)}-${pad(dayNum)}` });
    setDrawerType('dayDetail');
  };

  const handleLeaveSubmit = async () => {
    try {
      const errors = {
        type: !leaveForm.type,
        from: !leaveForm.from,
        to: !leaveForm.to,
        reason: !String(leaveForm.reason).trim()
      };
      
      if (errors.type || errors.from || errors.to || errors.reason) {
        setFormErrors(errors);
        return setToast({ message: 'Please fill all required fields.', type: 'error' });
      }
      
      setFormErrors({});

      await doAction('/attendance/leaves/apply/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveForm.type,
          start_date: leaveForm.from,
          end_date: leaveForm.to,
          reason: leaveForm.reason
        })
      });
      setToast({ message: 'Leave request submitted successfully!', type: 'success' });
      setDrawerType(null);
      setLeaveForm({ type: 'CL', from: '', to: '', reason: '' });
      loadLeaves();
    } catch (e) {
      const errMsg = typeof e === 'string' ? e : (e.detail || e.message || 'Failed to submit leave.');
      setToast({ message: errMsg, type: 'error' });
    }
  };

  /* ── CALENDAR RENDER ──────────────────────────────────── */
  const renderCalendar = () => {
    const allCells = [];

    // 1. Trailing days
    const prevMonthLastDate = new Date(viewYear, viewMonth - 1, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const dNum = prevMonthLastDate - i;
      const dStr = `${viewYear}-${pad(viewMonth - 1 || 12)}-${pad(dNum)}`;
      if (viewMonth === 1) { /* handle Jan year decrement simplified */ }
      const rec = history.find(r => r.date === dStr);
      const holiday = holidays.find(h => h.date === dStr);
      allCells.push({ type: 'day', dayNum: dNum, isOverflow: true, overflowType: 'prev', rec, holiday, key: `prev-${dNum}` });
    }

    // 2. Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${viewYear}-${pad(viewMonth)}-${pad(i)}`;
      const rec = history.find(r => r.date === dateStr);
      const holiday = holidays.find(h => h.date === dateStr);
      allCells.push({ type: 'day', dayNum: i, rec, holiday, isOverflow: false, key: `curr-${i}` });
    }

    // 3. Leading days
    const remainingSlots = 42 - allCells.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const dStr = `${viewYear}-${pad(viewMonth + 1 > 12 ? 1 : viewMonth + 1)}-${pad(i)}`;
      const rec = history.find(r => r.date === dStr);
      const holiday = holidays.find(h => h.date === dStr);
      allCells.push({ type: 'day', dayNum: i, isOverflow: true, overflowType: 'next', rec, holiday, key: `next-${i}` });
    }

    // Embed Leaves logic inside allCells
    allCells.forEach(c => {
      let cDateStr = '';
      if (!c.isOverflow) {
        cDateStr = `${viewYear}-${pad(viewMonth)}-${pad(c.dayNum)}`;
      } else if (c.overflowType === 'prev') {
        cDateStr = `${viewMonth === 1 ? viewYear - 1 : viewYear}-${pad(viewMonth === 1 ? 12 : viewMonth - 1)}-${pad(c.dayNum)}`;
      } else {
        cDateStr = `${viewMonth === 12 ? viewYear + 1 : viewYear}-${pad(viewMonth === 12 ? 1 : viewMonth + 1)}-${pad(c.dayNum)}`;
      }
      
      const foundLeave = leaves.find(l => {
        return cDateStr >= l.start_date && cDateStr <= l.end_date && (l.status === 'APPROVED' || l.status === 'PENDING');
      });
      if (foundLeave) c.leave = foundLeave;
    });

    const weeks = [];
    for (let i = 0; i < allCells.length; i += 7) weeks.push(allCells.slice(i, i + 7));

    return (
      <div className={styles.calendarGrid}>
        <div className={`${styles.calHeader} ${styles.calHeaderTotal}`}>
          Weekly<br />Hours
        </div>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className={styles.calHeader}>{d}</div>
        ))}

        {weeks.map((week, wi) => {
          let wkHrsDecimal = 0;
          week.forEach(c => {
            if (c.rec?.work_hours) wkHrsDecimal += parseFloat(c.rec.work_hours);
          });

          return (
            <Fragment key={`w-${wi}`}>
              <div className={styles.calTotalCell}>
                <div className={styles.weekRange}>
                  {(() => {
                    const getCD = (c) => c.isOverflow ? (c.overflowType === 'prev' ? new Date(viewYear, viewMonth - 2, c.dayNum) : new Date(viewYear, viewMonth, c.dayNum)) : new Date(viewYear, viewMonth - 1, c.dayNum);
                    const sD = getCD(week[0]);
                    const eD = getCD(week[week.length - 1]);
                    return `${sD.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${eD.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;
                  })()}
                </div>
                <div className={styles.weekHoursValue}>
                  {wkHrsDecimal > 0 ? formatDurationLong(wkHrsDecimal) : '—'}
                </div>
              </div>
              {week.map(cell => {
                const { dayNum, rec, holiday, isOverflow, overflowType } = cell;
                const isTodayCell = !isOverflow && isThisMonth && dayNum === now.getDate();

                const cellDate = isOverflow
                  ? (overflowType === 'prev' ? new Date(viewYear, viewMonth - 2, dayNum) : new Date(viewYear, viewMonth, dayNum))
                  : new Date(viewYear, viewMonth - 1, dayNum);
                const actualDow = cellDate.getDay();
                const isWeekend = actualDow === 0 || actualDow === 6;

                let bgClass = '', tagClass = '', tagLabel = '', IconComponent = null;

                if (isOverflow) {
                  bgClass = styles.calCellOverflow;
                }

                // Color entire cell based on STATUS
                if (cell.leave) {
                  const s = STATUS_MAP.LEAVE;
                  bgClass += cell.leave.status === 'APPROVED' ? ` ${styles.bgLeave}` : ` ${styles.bgWeekend}`; // Pending is grayish
                  tagClass = cell.leave.status === 'APPROVED' ? styles.tagLeave : styles.tagWeekend;
                  tagLabel = `${cell.leave.leave_type_display} (${cell.leave.status})`;
                  IconComponent = Palmtree;
                } else if (rec) {
                  const s = STATUS_MAP[rec.status] || {};
                  bgClass += ` ${styles[s.bg] || ''}`;
                  tagClass = styles[s.tag] || '';
                  tagLabel = rec.status === 'PRESENT' ? formatDuration(rec.work_hours) : s.label;
                } else if (holiday) {
                  const s = STATUS_MAP.HOLIDAY;
                  bgClass += ` ${styles[s.bg]}`;
                  tagClass = styles[s.tag];
                  tagLabel = holiday.category_display || 'Holiday';

                  if (holiday.category === 'NATIONAL') IconComponent = Flag;
                  else if (holiday.category === 'COMPANY') IconComponent = Crown;
                  else IconComponent = PartyPopper;
                } else if (isWeekend) {
                  bgClass += ` ${styles.bgWeekend}`;
                  tagClass = styles.tagWeekend;
                  tagLabel = 'Weekend';
                }

                return (
                  <motion.div
                    key={cell.key}
                    whileHover={{ scale: 1.02, zIndex: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`${styles.calCell} ${bgClass} ${isTodayCell ? styles.calToday : ''}`}
                    onClick={() => {
                      if (isOverflow) {
                        changeMonth(overflowType === 'prev' ? -1 : 1);
                      } else {
                        handleDayClick(dayNum, rec, holiday);
                      }
                    }}
                  >
                    <div className={styles.calDayNum}>{dayNum}</div>
                    <div className={styles.calDetails}>
                      {rec?.check_in_display && <div className={styles.calTime}>↗ {rec.check_in_display}</div>}
                      {rec?.check_out_display && <div className={styles.calTime}>↙ {rec.check_out_display}</div>}
                      {holiday && (
                        <div className={styles.calTime} style={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {IconComponent && <IconComponent size={10} />} {holiday.name}
                        </div>
                      )}
                    </div>
                    {tagLabel && <div className={`${styles.calStatusTag} ${tagClass}`}>{tagLabel}</div>}
                  </motion.div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ display: 'contents' }}
    >


      {/* ── MAIN ────────────────────────────────────────── */}
      <div className={styles.mainLayout}>
        <div className={styles.calendarCard}>
          <CalendarHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            monthName={monthName}
            viewYear={viewYear}
            changeMonth={changeMonth}
            isThisMonth={isThisMonth}
            onTodayClick={resetToToday}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.25 }}
            >
              {viewMode === 'calendar' ? (
                <>
                  <div className={styles.calendarWrap}>
                    {histLoading || holidayLoading ? (
                      <div className={styles.skeletonContainer}>
                        {[...Array(35)].map((_, i) => <div key={i} className={styles.skeletonCell} />)}
                      </div>
                    ) : renderCalendar()}
                  </div>
                  <div className={styles.legend}>
                    {[
                      { label: 'Present', color: '#10b981' },
                      { label: 'Half Day', color: '#f59e0b' },
                      { label: 'Absent', color: '#ef4444' },
                      { label: 'Holiday', color: '#3b82f6' },
                      { label: 'Leave', color: '#8b5cf6' },
                      { label: 'Weekend', color: '#94a3b8' },
                    ].map(l => (
                      <div key={l.label} className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.calendarWrap}>
                  {histLoading || holidayLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Loading records...</div>
                  ) : (() => {
                    // Build unified list: attendance records + holidays + leaves for this month
                    const monthStr = `${viewYear}-${pad(viewMonth)}`;
                    
                    const rows = [];

                    // Add all days in the current month
                    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
                    for (let d = daysInMonth; d >= 1; d--) {
                      const dateStr = `${viewYear}-${pad(viewMonth)}-${pad(d)}`;
                      const dow = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
                      const dateLabel = `${pad(d)} ${new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}`;
                      
                      const rec = history.find(r => r.date === dateStr);
                      const holiday = holidays.find(h => h.date === dateStr);
                      const leave = leaves.find(l => l.start_date <= dateStr && l.end_date >= dateStr && ['APPROVED','PENDING'].includes(l.status));
                      const isWeekend = [0, 6].includes(new Date(dateStr + 'T00:00:00').getDay());
                      
                      rows.push({ dateStr, dateLabel, dow, rec, holiday, leave, isWeekend });
                    }
                    
                    if (rows.every(r => !r.rec && !r.holiday && !r.leave)) {
                      return (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                          No records for {monthName} {viewYear}
                        </div>
                      );
                    }

                    return (
                      <div className={styles.unifiedList}>
                        {rows.map(({ dateStr, dateLabel, dow, rec, holiday, leave, isWeekend }) => {
                          // Determine row type and styles
                          let typeLabel = '', typeColor = '#94a3b8', typeBg = 'transparent', badgeVariant = 'default';
                          let detail = null;

                          if (holiday) {
                            typeLabel = holiday.name;
                            typeColor = '#0369a1';
                            typeBg = '#f0f9ff';
                            badgeVariant = 'primary';
                            detail = <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{holiday.category_display || 'Holiday'}</span>;
                          } else if (leave) {
                            const lt = LEAVE_TYPES_MAP[leave.leave_type] || {};
                            typeLabel = lt.label || leave.leave_type;
                            typeColor = lt.color || '#8b5cf6';
                            typeBg = `${lt.color || '#8b5cf6'}0d`;
                            badgeVariant = leave.status === 'APPROVED' ? 'purple' : 'warning';
                            const reason = leave.reason || '';
                            detail = (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', display: 'block' }}>
                                {leave.status} {reason ? `· ${reason}` : ''}
                              </span>
                            );
                          } else if (rec) {
                            const s = STATUS_MAP[rec.status] || {};
                            typeLabel = s.label || rec.status;
                            typeColor = rec.status === 'PRESENT' ? '#059669' : rec.status === 'ABSENT' ? '#dc2626' : '#d97706';
                            typeBg = rec.status === 'PRESENT' ? '#f0fdf4' : rec.status === 'ABSENT' ? '#fff5f5' : '#fffbeb';
                            badgeVariant = s.variant || 'default';
                            detail = (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                                {rec.check_in_display && <span>↗ {rec.check_in_display}</span>}
                                {rec.check_out_display && <span>↘ {rec.check_out_display}</span>}
                                {rec.work_hours && <span style={{ color: '#0f62fe', fontWeight: 700 }}>{formatDuration(rec.work_hours)}</span>}
                              </span>
                            );
                          } else if (isWeekend) {
                            typeLabel = 'Weekend';
                            typeBg = '#fafafa';
                          } else {
                            return null; // skip days with no data
                          }

                          return (
                            <div
                              key={dateStr}
                              className={styles.listRow}
                              style={{ background: typeBg }}
                            >
                              <div className={styles.listDateCol}>
                                <span className={styles.listDate}>{dateLabel}</span>
                                <span className={styles.listDow}>{dow}</span>
                              </div>
                              <div className={styles.listStatusCol}>
                                <span className={styles.listTypeLabel} style={{ color: typeColor }}>{typeLabel}</span>
                                {detail}
                              </div>
                              {(rec || holiday || leave) && (
                                <div className={styles.listBadgeCol}>
                                  <Badge variant={badgeVariant}>
                                    {holiday ? 'Holiday' : leave ? leave.status : (STATUS_MAP[rec?.status]?.label || rec?.status)}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <StatsSection
          summary={summary}
          leaveBalance={leaveBalance}
          upcomingHolidays={upcomingHolidays}
          canApplyLeave={canApplyLeave}
          onApplyLeave={() => setDrawerType('leave')}
        />
      </div>

      {/* ── DRAWERS ─────────────────────────────────────── */}
      <AnimatePresence>
        {drawerType && (
          <>
            <motion.div
              className={styles.drawerOverlay}
              onClick={() => setDrawerType(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className={styles.drawer}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className={styles.drawerHeader}>
                <h3 className={styles.drawerTitle}>
                  {drawerType === 'leave' ? 'Apply Leave' :
                    `${selectedDay?.date ? new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    }) : 'Day Details'}`}
                </h3>
                <button className={styles.drawerClose} onClick={() => setDrawerType(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className={styles.drawerBody}>
                {drawerType === 'leave' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Leave Type <span style={{color: '#ef4444'}}>*</span></label>
                      <select 
                        className={styles.formSelect} 
                        style={{ borderColor: formErrors.type ? '#ef4444' : '' }}
                        value={leaveForm.type} 
                        onChange={e => { setLeaveForm({ ...leaveForm, type: e.target.value }); setFormErrors({...formErrors, type: false}); }}
                      >
                        <option value="CL">Casual Leave</option>
                        <option value="PL">Privilege Leave</option>
                        <option value="SL">Sick Leave</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>From Date <span style={{color: '#ef4444'}}>*</span></label>
                      <input 
                        className={styles.formInput} 
                        type="date" 
                        style={{ borderColor: formErrors.from ? '#ef4444' : '' }}
                        value={leaveForm.from} 
                        onChange={e => { setLeaveForm({ ...leaveForm, from: e.target.value }); setFormErrors({...formErrors, from: false}); }} 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>To Date <span style={{color: '#ef4444'}}>*</span></label>
                      <input 
                        className={styles.formInput} 
                        type="date" 
                        style={{ borderColor: formErrors.to ? '#ef4444' : '' }}
                        value={leaveForm.to} 
                        onChange={e => { setLeaveForm({ ...leaveForm, to: e.target.value }); setFormErrors({...formErrors, to: false}); }} 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Reason <span style={{color: '#ef4444'}}>*</span></label>
                      <textarea 
                        className={styles.formTextarea} 
                        placeholder="Briefly explain..." 
                        style={{ borderColor: formErrors.reason ? '#ef4444' : '' }}
                        value={leaveForm.reason} 
                        onChange={e => { setLeaveForm({ ...leaveForm, reason: e.target.value }); setFormErrors({...formErrors, reason: false}); }} 
                      />
                    </div>
                    <button className={styles.submitBtn} onClick={handleLeaveSubmit}>Submit Leave Request</button>
                  </>
                )}
                {drawerType === 'dayDetail' && selectedDay && (
                  <div className={styles.dayDetailGrid}>
                    <div className={styles.dayDetailRow}>
                      <span className={styles.dayDetailLabel}>Date</span>
                      <span className={styles.dayDetailValue}>
                        {selectedDay.date ? new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-IN', {
                          weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
                        }) : '—'}
                      </span>
                    </div>
                    <div className={styles.dayDetailRow}>
                      <span className={styles.dayDetailLabel}>Status</span>
                      {selectedDay.holiday ? (
                        <span className={`${styles.dayDetailStatus} ${styles[STATUS_MAP.HOLIDAY.tag]}`}>
                          Holiday: {selectedDay.holiday.name}
                        </span>
                      ) : selectedDay.rec ? (
                        <span className={`${styles.dayDetailStatus} ${styles[STATUS_MAP[selectedDay.rec.status]?.tag] || ''}`}>
                          {STATUS_MAP[selectedDay.rec.status]?.label || selectedDay.rec.status}
                        </span>
                      ) : (
                        <span className={styles.dayDetailValue} style={{ color: '#94a3b8' }}>No Record</span>
                      )}
                    </div>
                    {selectedDay.rec && (
                      <>
                        <div className={styles.dayDetailRow}>
                          <span className={styles.dayDetailLabel}>Check In</span>
                          <span className={styles.dayDetailValue}>{selectedDay.rec.check_in_display || '—'}</span>
                        </div>
                        <div className={styles.dayDetailRow}>
                          <span className={styles.dayDetailLabel}>Check Out</span>
                          <span className={styles.dayDetailValue}>{selectedDay.rec.check_out_display || '—'}</span>
                        </div>
                        <div className={styles.dayDetailRow}>
                          <span className={styles.dayDetailLabel}>Work Hours</span>
                          <span className={styles.dayDetailValue} style={{ color: '#0f62fe' }}>
                            {selectedDay.rec.work_hours ? `${selectedDay.rec.work_hours}h` : '—'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </motion.div>
  );
}
