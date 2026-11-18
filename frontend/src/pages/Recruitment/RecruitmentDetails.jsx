import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import Button from '../../components/common/Button/Button';
import styles from './RecruitmentDetails.module.css';
import ApplicationWorkflow from './ApplicationWorkflow';

const STAGES = {
  SHORTLIST: 'Shortlist',
  TELEPHONIC: 'Phone interview',
  SCREENING: 'Screening',
  TECHNICAL: 'Technical interview',
  MANAGER: 'Manager interview',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export default function RecruitmentDetails() {
  const { id } = useParams();
  const session = JSON.parse(localStorage.getItem('hireflow_user') || '{}');
  const canEdit = session.is_superuser || session.permissions?.includes('recruitment:update');
  const canOnboard = session.is_superuser || session.permissions?.includes('users:add');
  const [expandedApplication, setExpandedApplication] = useState(null);
  const endpoint = `/recruitment/positions/${encodeURIComponent(id)}/`;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const load = useCallback(async () => {
    const [job, applications, matches] = await Promise.all([
      apiClient(endpoint),
      apiClient(`${endpoint}applications/`),
      apiClient(`${endpoint}matches/`),
    ]);
    return { job, applications, matches };
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setCredentials(null);
    load().then(result => {
      if (active) setData(result);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, [load]);

  async function change(path, method, body) {
    setBusy(true);
    setError('');
    try {
      const result = await apiClient(`${endpoint}${path}`, {
        method,
        body: JSON.stringify(body),
      });
      if (result.generated_password) setCredentials(result);
      setData(await load());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.jdSection}>
      <Link to="/recruitment">Back to recruitment</Link>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading recruitment pipeline...</p>}
      {data && (
        <>
          <h1>{data.job.title}</h1>
          <p>{data.job.job_id} · {data.job.department_name} · {data.job.location}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{data.job.job_description}</p>
          {data.job.requirements && <p>Required skills: {data.job.requirements}</p>}
          <h2>Matched candidates</h2>
          {data.matches.length ? (
            <ul>
              {data.matches.map(candidate => (
                <li key={candidate.id}>
                  <strong>{candidate.name}</strong> · {candidate.score}% skills match
                  <p>{candidate.matched_skills.join(', ')}</p>
                  <Button disabled={busy || !canEdit} onClick={() => change('shortlist/', 'POST', { candidate: candidate.id })}>
                    Shortlist
                  </Button>
                </li>
              ))}
            </ul>
          ) : <p>No unshortlisted candidates match the listed skills.</p>}
          <h2>Applications</h2>
          {data.applications.length ? (
            <ul>
              {data.applications.map(application => (
                <li key={application.id}>
                  <label>
                    {application.candidate_name}{' '}
                    <select
                      value={application.current_stage}
                      disabled={busy || !canEdit || Boolean(application.employee)}
                      onChange={event => change(`applications/${application.id}/stage/`, 'PATCH', {
                        current_stage: event.target.value,
                      })}
                    >
                      {Object.entries(STAGES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => setExpandedApplication(
                    expandedApplication === application.id ? null : application.id
                  )}>
                    {expandedApplication === application.id ? 'Hide details' : 'Interviews, offer and history'}
                  </button>
                  {expandedApplication === application.id && (
                    <ApplicationWorkflow
                      endpoint={endpoint}
                      applicationId={application.id}
                      canEdit={canEdit}
                      canScore={interview => session.is_superuser || (canEdit && session.id === interview.interviewer)}
                    />
                  )}
                  {application.employee && <span> Employee #{application.employee}</span>}
                  {canOnboard && application.current_stage === 'HIRED' && !application.employee && (
                    <Button
                      disabled={busy}
                      onClick={() => change(`applications/${application.id}/onboard/`, 'POST', {})}
                    >
                      Create employee
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p>No applications yet.</p>}
          {credentials && (
            <p role="status">
              Employee #{credentials.employee} temporary password: <code>{credentials.generated_password}</code>
              {' '}<button type="button" onClick={() => setCredentials(null)}>Dismiss</button>
            </p>
          )}
        </>
      )}
    </section>
  );
}
