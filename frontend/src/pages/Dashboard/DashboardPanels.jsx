import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import Modal from '../../components/common/Modal/Modal';
import PageState from '../../components/common/PageState';
import { dateLabel, statusLabel } from './dashboardData';
import styles from './DashboardOverview.module.css';

const jobStatuses = [
  { code: 'ACTIVE', label: 'Active', tone: 'active' },
  { code: 'DRAFT', label: 'Draft', tone: 'draft' },
  { code: 'CLOSED', label: 'Closed', tone: 'closed' },
];
const hours = record => Number(record?.work_hours) || 0;

function ChartState({ resource, loading, empty, children }) {
  if (resource.error) return <PageState tone="error" title="Chart could not be loaded">{resource.error}</PageState>;
  if (!resource.data) return <PageState title={loading} />;
  if (!resource.data.length) return <PageState title={empty} />;
  return children;
}

export function RecruitmentPanel({ resource }) {
  const jobs = resource.data || [];
  const items = jobStatuses.map(status => ({
    ...status, count: jobs.filter(job => job.status === status.code).length,
  }));
  return (
    <Card title="Recruitment overview" extra={<Link className={styles.inlineLink} to="/recruitment">
      Open recruitment <ArrowRight size={15} aria-hidden="true" />
    </Link>}>
      <ChartState resource={resource} loading="Loading recruitment overview..." empty="No vacancies to chart yet">
        <div className={styles.chartIntro}><strong>{jobs.length}</strong><span>Total job positions by status</span></div>
        <ul className={styles.breakdown}>
          {items.map(({ label, count, tone }) => (
            <li key={label} data-tone={tone}>
              <span>{label}</span>
              <span className={styles.track} aria-hidden="true"><span style={{ width: (count / jobs.length * 100) + '%' }} /></span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </ChartState>
    </Card>
  );
}

export function AttendancePanel({ resource, dates, period, onPeriodChange }) {
  const [selected, setSelected] = useState(null);
  const records = new Map((resource.data || []).map(record => [record.date, record]));
  const days = dates.map(date => ({ date, record: records.get(date) }));
  const visible = days.filter(day => day.record);
  const total = visible.reduce((sum, day) => sum + hours(day.record), 0);
  const ceiling = Math.max(8, ...visible.map(day => hours(day.record)));

  return (
    <Card title="My recorded work hours" extra={<div className={styles.period} aria-label="Attendance period">
      {[7, 14].map(days => <Button key={days} type="button" size="sm" variant={period === days ? 'primary' : 'outline'}
        aria-pressed={period === days} onClick={() => onPeriodChange(days)}>{days} days</Button>)}
    </div>}>
      <ChartState resource={{ ...resource, data: resource.data && visible }}
        loading="Loading attendance..." empty="No attendance records for this period">
        <div className={styles.chartIntro}><strong>{Math.round(total * 10) / 10}h</strong>
          <span>Across {visible.length} recorded {visible.length === 1 ? 'day' : 'days'}</span></div>
        <div className={styles.attendanceChart} aria-label="Recorded hours by day">
          {days.map(({ date, record }) => {
            const label = dateLabel(date, { day: 'numeric', month: 'short' });
            return (
              <div className={styles.chartDay} key={date}>
                {record ? <button type="button" title={label + ': ' + hours(record) + ' hours'}
                  aria-label={label + ': ' + hours(record) + ' hours. View attendance details'}
                  className={styles.dayBar} onClick={() => setSelected(record)}>
                  <span style={{ height: Math.max(2, hours(record) / ceiling * 100) + '%' }} />
                </button> : <span className={styles.dayBar} aria-label={label + ': no record'} />}
                <small>{label}</small>
              </div>
            );
          })}
        </div>
      </ChartState>
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} size="sm"
        title={selected ? dateLabel(selected.date, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Attendance details'}>
        {selected && <div className={styles.holidayDetail}>
          <Badge variant="info">{statusLabel(selected.status)}</Badge>
          <dl className={styles.detailGrid}>
            <dt>Check-in</dt><dd>{selected.check_in_display || '—'}</dd>
            <dt>Check-out</dt><dd>{selected.check_out_display || '—'}</dd>
            <dt>Recorded hours</dt><dd>{hours(selected)}h</dd>
          </dl>
          <Link to="/my-calendar" onClick={() => setSelected(null)}>Open my calendar</Link>
        </div>}
      </Modal>
    </Card>
  );
}
