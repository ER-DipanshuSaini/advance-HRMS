import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, CalendarDays, RefreshCw, Users } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { navigation } from '../../navigation';
import { displayName, hasPermission } from '../../session';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import DataTable from '../../components/common/DataTable/DataTable';
import MetricStrip from '../../components/common/MetricStrip/MetricStrip';
import Modal from '../../components/common/Modal/Modal';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import PageLayout from '../../components/common/PageLayout';
import PageState from '../../components/common/PageState';
import { AttendancePanel, RecruitmentPanel } from './DashboardPanels';
import { dateLabel, recentDates, statusLabel } from './dashboardData';
import styles from './DashboardOverview.module.css';

const jobPath = job => '/recruitment/pipeline/' + encodeURIComponent(job.job_id);
const jobTones = { ACTIVE: 'success', DRAFT: 'warning', CLOSED: 'info' };
const jobColumns = [
  { key: 'job', label: 'Job opening', width: '35%', render: job => <Link className={styles.tableLink}
    to={jobPath(job)}>{job.title}<small>{job.job_id}</small></Link> },
  { key: 'department', label: 'Department', render: job => job.department_name || '—' },
  { key: 'openings', label: 'Openings', render: job => job.headcount },
  { key: 'status', label: 'Status', render: job => <Badge variant={jobTones[job.status]}>{statusLabel(job.status)}</Badge> },
  { key: 'stage', label: 'Latest stage', render: job => job.current_process_stage || '—' },
];

function DashboardShortcuts({ user }) {
  const links = navigation.filter(item => item.description && hasPermission(user, item.permission));
  return (
    <section className={styles.shortcuts} aria-labelledby="dashboard-shortcuts">
      <h2 id="dashboard-shortcuts">Quick links</h2>
      <div className={styles.links}>
        {links.map(({ href, label, description, Icon }) => (
          <Card as={Link} variant="shortcut" key={href} to={href} noPadding>
            <span className={styles.cardContent}>
              <span className={styles.icon}><Icon size={18} aria-hidden="true" /></span>
              <span><strong>{label}</strong><span className={styles.description}>{description}</span></span>
              <ArrowRight size={16} className={styles.arrow} aria-hidden="true" />
            </span>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HolidaysPanel({ resource, onSelect }) {
  return (
    <Card title="Upcoming holidays">
      {resource.error ? <PageState title="Holidays could not be loaded" tone="error">{resource.error}</PageState> :
        !resource.data ? <PageState title="Loading holidays..." /> :
        !resource.data.length ? <PageState title="No upcoming holidays" /> :
          <ul className={styles.holidayList}>
            {resource.data.map(holiday => (
              <li key={holiday.id}>
                <button type="button" className={styles.holiday} onClick={() => onSelect(holiday)}>
                  <time className={styles.holidayDate} dateTime={holiday.date}>
                    <strong>{dateLabel(holiday.date, { day: 'numeric' })}</strong>
                    <span>{dateLabel(holiday.date, { month: 'short' })}</span>
                  </time>
                  <span className={styles.holidayName}><strong>{holiday.name}</strong><small>{holiday.category_display}</small></span>
                  <ArrowRight size={16} className={styles.arrow} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>}
    </Card>
  );
}

export default function DashboardOverview() {
  const user = useOutletContext();
  const canViewJobs = hasPermission(user, 'recruitment:view');
  const canViewEmployees = hasPermission(user, 'users:view');
  const canViewDepartments = hasPermission(user, 'depts:view');
  const hasAttendanceAll = user?.permissions?.includes('attendance:view_all');
  const canViewAttendance = Boolean(hasAttendanceAll || user?.permissions?.includes('attendance:view_own'));
  const userId = user?.id;
  const [period, setPeriod] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [resources, setResources] = useState({});
  const [holiday, setHoliday] = useState(null);

  const dates = recentDates(14);
  const end = dates.at(-1);
  const start = dates[0];

  useEffect(() => {
    const controller = new AbortController();
    const endpoints = {
      holidays: '/attendance/holidays/?upcoming=1',
      ...(canViewJobs && { jobs: '/recruitment/positions/' }),
      ...(canViewEmployees && { employees: '/iam/employees/?page_size=1' }),
      ...(canViewDepartments && { departments: '/org/departments/' }),
      ...(canViewAttendance && userId && {
        attendance: '/attendance/records/?' + new URLSearchParams({
          start_date: start, end_date: end, ...(hasAttendanceAll && { user_id: userId }),
        }),
      }),
    };
    setResources(Object.fromEntries(Object.keys(endpoints).map(key => [key, { loading: true }])));
    for (const [key, path] of Object.entries(endpoints)) {
      const update = result => {
        if (!controller.signal.aborted) setResources(previous => ({ ...previous, [key]: result }));
      };
      apiClient(path, { signal: controller.signal })
        .then(data => update({ data }))
        .catch(error => update({ error: error.message || 'Please try again.' }));
    }
    return () => controller.abort();
  }, [canViewJobs, canViewEmployees, canViewDepartments, canViewAttendance, hasAttendanceAll, userId, start, end, refresh]);

  const jobs = resources.jobs?.data;
  const attendance = resources.attendance?.data;
  const metrics = [
    ...(canViewEmployees ? [{ label: 'Employees', value: resources.employees?.data?.count ?? '—', Icon: Users }] : []),
    ...(canViewDepartments ? [{ label: 'Departments', value: resources.departments?.data?.length ?? '—', Icon: Building2 }] : []),
    ...(canViewJobs ? [{ label: 'Active jobs', value: jobs?.filter(job => job.status === 'ACTIVE').length ?? '—', Icon: Briefcase, tone: 'success' }] : []),
    { label: 'Upcoming holidays', value: resources.holidays?.data ? (resources.holidays.data.length === 5 ? '5+' : resources.holidays.data.length) : '—',
      Icon: CalendarDays, tone: 'warning' },
  ];
  const isRefreshing = Object.values(resources).some(resource => resource.loading);
  const directoryError = resources.employees?.error || resources.departments?.error;

  return (
    <PageLayout>
      <PageHeader title={'Welcome, ' + (user?.first_name || displayName(user))}
        description={dateLabel(end, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={<Button variant="outline" icon={<RefreshCw size={16} />} loading={isRefreshing}
          onClick={() => setRefresh(value => value + 1)}>Refresh dashboard</Button>} />

      <MetricStrip metrics={metrics} />
      {directoryError && <PageState tone="error" title="Some overview counts could not be loaded">{directoryError}</PageState>}

      <div className={styles.overviewGrid} data-wide={canViewJobs || canViewAttendance}>
        {canViewJobs ? <RecruitmentPanel resource={resources.jobs || {}} /> :
          canViewAttendance && <AttendancePanel resource={resources.attendance || {}} dates={dates.slice(-period)}
            period={period} onPeriodChange={setPeriod} />}
        <HolidaysPanel resource={resources.holidays || {}} onSelect={setHoliday} />
      </div>

      {canViewJobs && canViewAttendance && <AttendancePanel resource={{ ...resources.attendance, data: attendance }}
        dates={dates.slice(-period)} period={period} onPeriodChange={setPeriod} />}

      {canViewJobs && <section aria-labelledby="dashboard-openings" className={styles.shortcuts}>
        <div className={styles.sectionHeading}>
          <h2 id="dashboard-openings">Recent job openings</h2>
          <Link to="/recruitment">View recruitment <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <DataTable label="Recent job openings" columns={jobColumns} rows={jobs?.slice(0, 5) || []} rowKey={job => job.id}
          loading={!jobs && !resources.jobs?.error} error={resources.jobs?.error} onRetry={() => setRefresh(value => value + 1)}
          empty={{ title: 'No job openings yet', description: 'New openings will appear here when they are created.' }} />
      </section>}

      <DashboardShortcuts user={user} />

      <Modal isOpen={Boolean(holiday)} title={holiday?.name} size="sm" onClose={() => setHoliday(null)}>
        {holiday && <div className={styles.holidayDetail}>
          <p>{dateLabel(holiday.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {holiday.category_display && <Badge variant="info">{holiday.category_display}</Badge>}
          {holiday.description && <p>{holiday.description}</p>}
        </div>}
      </Modal>
    </PageLayout>
  );
}
