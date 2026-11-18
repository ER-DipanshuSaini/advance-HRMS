import PageLayout from '../../components/common/PageLayout';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Briefcase, MapPin, Plus, Users } from 'lucide-react';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import DataTable from '../../components/common/DataTable/DataTable';
import TableToolbar from '../../components/common/DataTable/TableToolbar';
import MetricStrip from '../../components/common/MetricStrip/MetricStrip';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import { recruitmentService } from '../../api/recruitmentService';
import { hasPermission } from '../../session';
import CreateRecruitmentWizard from './CreateRecruitmentWizard';
import styles from './RecruitmentDashboard.module.css';

const statuses = [{ value: '', label: 'All statuses' }, ...['Active', 'Draft', 'Closed'].map(label => ({
  label, value: label.toUpperCase(),
}))];
const modes = { ON_SITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' };
const tones = { Hired: 'success', Rejected: 'danger', Sourcing: 'warning' };
const pipelinePath = id => '/recruitment/pipeline/' + encodeURIComponent(id);

const columns = [
  { key: 'number', label: 'S.No', width: '60px', render: (_, index) => index + 1 },
  { key: 'id', label: 'Job ID', width: '120px', render: job => <span className={styles.jobIdBadge}>{job.job_id}</span> },
  { key: 'title', label: 'Role Name', width: '250px', render: job =>
    <Link className={styles.roleLink} to={pipelinePath(job.job_id)}>{job.title}</Link> },
  { key: 'department', label: 'Department', render: job => job.department_name || '—' },
  { key: 'experience', label: 'Experience', render: job => job.experience_range || '—' },
  { key: 'openings', label: 'Openings', width: '100px', render: job => job.headcount },
  { key: 'location', label: 'Location', render: job => <div className={styles.location}>
    <strong>{modes[job.location_mode]}</strong>
    {job.location && <span><MapPin size={10} aria-hidden="true" />{job.location}</span>}
  </div> },
  { key: 'budget', label: 'Budget', render: job => <span className={styles.budget}>{job.budget_range || '—'}</span> },
  { key: 'stage', label: 'Process Stage', width: '180px', render: job =>
    <Badge variant={tones[job.current_process_stage] || 'primary'}>{job.current_process_stage}</Badge> },
  { key: 'date', label: 'Opening Date', render: job => job.opening_date || '—' },
];

export default function RecruitmentDashboard() {
  const user = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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

  const canCreate = hasPermission(user, 'recruitment:add');
  const createJob = () => setShowWizard(true);
  const query = search.trim().toLowerCase();
  const visible = (jobs || []).filter(job =>
    (!status || job.status === status) &&
    [job.title, job.department_name, job.job_id, job.location].some(value => value?.toLowerCase().includes(query))
  );
  const active = (jobs || []).filter(job => job.status === 'ACTIVE');
  function clearFilters() {
    setSearch('');
    setStatus('');
  }

  return (
    <PageLayout>
      <PageHeader title="Recruitment Command Center" actions={canCreate &&
        <Button icon={<Plus size={16} />} onClick={createJob}>New Recruitment</Button>} />
      {jobs && <MetricStrip metrics={[
        { label: 'Active Openings', value: active.reduce((count, job) => count + job.headcount, 0), Icon: Briefcase },
        { label: 'Active Pipelines', value: active.length, Icon: Users, tone: 'success' },
        { label: 'Total Jobs', value: jobs.length, Icon: Briefcase, tone: 'warning' },
      ]} />}
      <DataTable label="Job openings" columns={columns} rows={visible} rowKey={job => job.id}
        onRowClick={job => navigate(pipelinePath(job.job_id))} loading={!jobs && !error} error={error} onRetry={load}
        empty={jobs?.length ? {
          tone: 'filtered', title: 'No jobs match your search', description: 'Adjust your search or status filter.',
          action: { label: 'Clear filters', run: clearFilters },
        } : {
          title: 'No recruitment pipelines yet',
          description: canCreate ? 'Create a job opening to start tracking candidates.' : 'Job openings will appear here once they are created.',
          icon: Briefcase,
          action: canCreate && { label: 'Create job opening', icon: <Plus size={15} />, run: createJob },
        }}
        toolbar={<TableToolbar search={search} onSearch={setSearch} searchLabel="Search jobs"
          placeholder="Search by Job ID, Department, or Role..." onReset={clearFilters}
          filters={[{ label: 'Status', value: status, onChange: setStatus, options: statuses }]} />} />
      {showWizard && <CreateRecruitmentWizard onClose={() => setShowWizard(false)} onCreate={id => {
        setShowWizard(false);
        navigate(pipelinePath(id));
      }} />}
    </PageLayout>
  );
}
