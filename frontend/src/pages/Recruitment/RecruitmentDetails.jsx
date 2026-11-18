import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { hasPermission } from '../../session';
import Button from '../../components/common/Button/Button';
import PageState from '../../components/common/PageState';
import ApplicationWorkflow from './ApplicationWorkflow';
import styles from './RecruitmentDetails.module.css';

const stages = {
  SHORTLIST: 'Shortlist', TELEPHONIC: 'Phone interview', SCREENING: 'Screening',
  TECHNICAL: 'Technical interview', MANAGER: 'Manager interview', HIRED: 'Hired', REJECTED: 'Rejected',
};

export default function RecruitmentDetails() {
  const { id } = useParams();
  const user = useOutletContext();
  const canEdit = hasPermission(user, 'recruitment:update');
  const canOnboard = hasPermission(user, 'users:add');
  const endpoint = '/recruitment/positions/' + encodeURIComponent(id) + '/';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async signal => {
    const [job, applications, matches] = await Promise.all(
      ['', 'applications/', 'matches/'].map(path => apiClient(endpoint + path, { signal }))
    );
    setData({ job, applications, matches });
  }, [endpoint]);

  const refresh = useCallback(async signal => {
    setError('');
    try {
      await load(signal);
    } catch (failure) {
      if (!signal?.aborted) setError(failure.message);
    }
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setExpanded(null);
    setCredentials(null);
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  async function change(path, method, body) {
    setBusy(true);
    setError('');
    try {
      const result = await apiClient(endpoint + path, { method, body: JSON.stringify(body) });
      if (result?.generated_password) setCredentials(result);
      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-stack">
      <Link className={styles.back} to="/recruitment"><ArrowLeft size={16} aria-hidden="true" /> Recruitment</Link>
      {error && <PageState title="Recruitment request failed" tone="error"
        action={{ label: 'Reload job', run: () => refresh() }}>{error}</PageState>}
      {!data && !error && <PageState title="Loading job..." />}
      {data && <>
        <header className="ui-panel">
          <h1>{data.job.title}</h1>
          <p className={styles.meta}>
            {[data.job.job_id, data.job.department_name, data.job.location].filter(Boolean).map((value, index) =>
              <span key={index}>{value}</span>)}
          </p>
          {data.job.job_description && <p className={styles.description}>{data.job.job_description}</p>}
          {data.job.requirements && <p className={styles.description}><strong>Required skills</strong> {data.job.requirements}</p>}
        </header>

        <section className="ui-panel" aria-labelledby="candidate-matches">
          <h2 id="candidate-matches">Matched candidates</h2>
          {data.matches.length ? <ul className={styles.list}>{data.matches.map(candidate => (
            <li key={candidate.id} className={styles.row}>
              <div className={styles.rowHeader}>
                <div><strong>{candidate.name}</strong><p>{candidate.score}% skill match · {candidate.matched_skills.join(', ')}</p></div>
                {canEdit && <Button variant="outline" disabled={busy}
                  onClick={() => change('shortlist/', 'POST', { candidate: candidate.id })}>Shortlist</Button>}
              </div>
            </li>
          ))}</ul> : <PageState title="No new candidates match these skills" />}
        </section>

        <section className="ui-panel" aria-labelledby="job-applications">
          <h2 id="job-applications">Applications</h2>
          {credentials && <div className={styles.rowHeader} role="status">
            <p>Temporary password for employee {credentials.employee} <code>{credentials.generated_password}</code></p>
            <Button variant="outline" onClick={() => setCredentials(null)}>Dismiss</Button>
          </div>}
          {data.applications.length ? <ul className={styles.list}>{data.applications.map(application => {
            const detailsId = 'application-' + application.id;
            const path = 'applications/' + application.id + '/';
            return (
              <li key={application.id} className={styles.row}>
                <div className={styles.rowHeader}>
                  <div>
                    <strong>{application.candidate_name}</strong>
                    {application.employee && <p>Employee #{application.employee}</p>}
                  </div>
                  <div className={styles.actions}>
                    {canEdit && !application.employee ? <select className="ui-control"
                      aria-label={'Stage for ' + application.candidate_name} value={application.current_stage} disabled={busy}
                      onChange={event => change(path + 'stage/', 'PATCH', { current_stage: event.target.value })}>
                      {Object.entries(stages).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select> : <span>{stages[application.current_stage] || application.current_stage}</span>}
                    <Button variant="outline" aria-expanded={expanded === application.id} aria-controls={detailsId}
                      onClick={() => setExpanded(expanded === application.id ? null : application.id)}>
                      {expanded === application.id ? 'Hide details' : 'View details'}
                    </Button>
                    {canOnboard && application.current_stage === 'HIRED' && !application.employee &&
                      <Button disabled={busy} onClick={() => change(path + 'onboard/', 'POST', {})}>Create employee</Button>}
                  </div>
                </div>
                <div id={detailsId} hidden={expanded !== application.id}>
                  {expanded === application.id && <ApplicationWorkflow endpoint={endpoint} applicationId={application.id}
                    canEdit={canEdit} canScore={interview => user.is_superuser || (canEdit && user.id === interview.interviewer)} />}
                </div>
              </li>
            );
          })}</ul> : <PageState title="No applications yet" />}
        </section>
      </>}
    </section>
  );
}
