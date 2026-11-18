import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { AlertCircle, Briefcase, ChevronDown, Filter, MapPin, Plus, Search, Users } from 'lucide-react';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import { recruitmentService } from '../../api/recruitmentService';
import { hasPermission } from '../../session';
import CreateRecruitmentWizard from './CreateRecruitmentWizard';
import styles from './RecruitmentDashboard.module.css';

const statuses = { ACTIVE: 'Active', DRAFT: 'Draft', CLOSED: 'Closed' };
const modes = { ON_SITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' };
const columns = ['S.No', 'Job ID', 'Role Name', 'Department', 'Experience', 'Openings', 'Location', 'Budget', 'Process Stage', 'Opening Date'];
const widths = { 'S.No': '60px', 'Job ID': '120px', 'Role Name': '250px', Openings: '100px', 'Process Stage': '180px' };
const pipelinePath = id => '/recruitment/pipeline/' + encodeURIComponent(id);

function Metrics({ jobs }) {
  const active = jobs.filter(job => job.status === 'ACTIVE');
  const metrics = [
    { label: 'Active Openings', value: active.reduce((count, job) => count + job.headcount, 0), Icon: Briefcase, background: '#eff6ff', color: '#2563eb' },
    { label: 'Active Pipelines', value: active.length, Icon: Users, background: '#ecfdf5', color: '#059669' },
    { label: 'Total Jobs', value: jobs.length, Icon: Briefcase, background: '#fffbeb', color: '#d97706' },
  ];
  return (
    <div className={styles.metricsStrip}>
      {metrics.map(({ label, value, Icon, background, color }) => (
        <div className={styles.metricItem} key={label}>
          <div className={styles.metricIcon} style={{ background, color }}><Icon size={18} aria-hidden="true" /></div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>{label}</span>
            <span className={styles.metricValue}>{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TableState({ title, children, action, error = false, loading = false }) {
  return (
    <tr><td colSpan={columns.length}>
      <div className={styles.emptyState} role={error ? 'alert' : 'status'}>
        {loading ? <div className={styles.spinner} aria-hidden="true" /> :
          <AlertCircle size={40} aria-hidden="true" className={styles.emptyIcon} />}
        <h3>{title}</h3>
        {children && <p>{children}</p>}
        {action && <Button variant="outline" onClick={action.run}>{action.label}</Button>}
      </div>
    </td></tr>
  );
}

export default function RecruitmentDashboard() {
  const user = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setJobs(await recruitmentService.getPositions());
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const query = search.trim().toLowerCase();
  const visible = (jobs || []).filter(job =>
    (!status || job.status === status) &&
    [job.title, job.department_name, job.job_id, job.location].some(value => value?.toLowerCase().includes(query))
  );
  function clearFilters() {
    setSearch('');
    setStatus('');
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <h1 className={styles.headerTitle}>Recruitment Command Center</h1>
        {hasPermission(user, 'recruitment:add') &&
          <Button icon={<Plus size={16} />} onClick={() => setShowWizard(true)}>New Recruitment</Button>}
      </header>
      {jobs && <Metrics jobs={jobs} />}
      <Card noPadding shadow="sm" className={styles.mainContainer}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} aria-hidden="true" />
              <input className={styles.mainSearch} type="search" aria-label="Search jobs"
                placeholder="Search by Job ID, Department, or Role..." value={search}
                onChange={event => setSearch(event.target.value)} />
            </div>
          </div>
          <div className={styles.toolbarRight}>
            <Button variant="outline" icon={<Filter size={15} />} aria-controls="recruitment-filters"
              aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}>
              Advanced Filters <ChevronDown size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div id="recruitment-filters" className={styles.filterBar} hidden={!showFilters}>
          <label htmlFor="recruitment-status">Status</label>
          <select id="recruitment-status" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {(status || search) && <Button variant="ghost" onClick={clearFilters}>Reset Filters</Button>}
        </div>
        <div className={styles.tableResponsive} tabIndex={0} role="region" aria-label="Job openings">
          <table className={styles.saasTable}>
            <thead><tr>{columns.map(label =>
              <th key={label} scope="col" style={widths[label] ? { width: widths[label] } : undefined}>{label}</th>
            )}</tr></thead>
            <tbody>
              {error ? <TableState title="Jobs could not be loaded" error action={{ label: 'Retry', run: load }}>{error}</TableState> :
                !jobs ? <TableState title="Loading recruitment pipelines..." loading /> :
                !visible.length ? <TableState title={jobs.length ? 'No results match your criteria' : 'No recruitment pipelines yet'}
                  action={jobs.length ? { label: 'Clear filters', run: clearFilters } : undefined}>
                  {jobs.length ? 'Adjust your search or status filter.' : undefined}
                </TableState> :
                visible.map((job, index) => (
                  <tr key={job.id} className={styles.clickableRow}
                    onClick={event => { if (!event.target.closest('a')) navigate(pipelinePath(job.job_id)); }}>
                    <td className={styles.srNoCell}>{index + 1}</td>
                    <td><span className={styles.jobIdBadge}>{job.job_id}</span></td>
                    <td className={styles.roleNameCell}><Link to={pipelinePath(job.job_id)}>{job.title}</Link></td>
                    <td>{job.department_name || '—'}</td>
                    <td className={styles.expCell}>{job.experience_range || '—'}</td>
                    <td className={styles.headcountCell}>{job.headcount}</td>
                    <td><div className={styles.locationStack}>
                      <span className={styles.locMode}>{modes[job.location_mode]}</span>
                      {job.location && <span className={styles.locCity}><MapPin size={10} aria-hidden="true" /> {job.location}</span>}
                    </div></td>
                    <td className={styles.budgetCell}>{job.budget_range || '—'}</td>
                    <td><Badge variant={job.current_process_stage === 'Hired' ? 'success' :
                      job.current_process_stage === 'Rejected' ? 'danger' :
                      job.current_process_stage === 'Sourcing' ? 'warning' : 'primary'}>
                      {job.current_process_stage}
                    </Badge></td>
                    <td>{job.opening_date || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      {showWizard && <CreateRecruitmentWizard onClose={() => setShowWizard(false)} onCreate={id => {
        setShowWizard(false);
        navigate(pipelinePath(id));
      }} />}
    </>
  );
}
