import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/apiClient';

const NEXT_OFFER_STATUS = {
  DRAFT: ['SENT', 'WITHDRAWN'],
  SENT: ['ACCEPTED', 'DECLINED', 'WITHDRAWN'],
};

export default function ApplicationWorkflow({ endpoint, applicationId, canEdit, canScore }) {
  const path = `${endpoint}applications/${applicationId}/`;
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [interviews, offer, history, interviewers] = await Promise.all([
      apiClient(`${path}interviews/`),
      apiClient(`${path}offer/`),
      apiClient(`${path}history/`),
      canEdit ? apiClient('/recruitment/positions/interviewers/') : [],
    ]);
    return { interviews, offer, history, interviewers };
  }

  useEffect(() => {
    let active = true;
    load().then(result => {
      if (active) setDetails(result);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, [path, canEdit]);

  async function submit(event, resource, method, transform = data => data) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await apiClient(`${path}${resource}`, { method, body: JSON.stringify(transform(data)) });
      setDetails(await load());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {!details && !error && <p role="status">Loading application details...</p>}
      {details && <>
        <h3>Interviews</h3>
        {details.interviews.map(interview => (
          <div key={interview.id}>
            <p>{interview.interviewer_name || `Employee #${interview.interviewer}`} · {new Date(interview.scheduled_at).toLocaleString()} · {interview.duration_minutes} min</p>
            {canScore(interview) ? (
              <form onSubmit={event => submit(event, `interviews/${interview.id}/scorecard/`, 'PATCH')}>
                <label>Technical score <input name="technical_score" type="number" min="1" max="5" defaultValue={interview.technical_score ?? ''} required /></label>
                <label>Communication score <input name="communication_score" type="number" min="1" max="5" defaultValue={interview.communication_score ?? ''} required /></label>
                <label>Feedback <textarea name="feedback" defaultValue={interview.feedback} /></label>
                <button disabled={busy}>Save scorecard</button>
              </form>
            ) : interview.technical_score && (
              <p>Technical {interview.technical_score}/5 · Communication {interview.communication_score}/5 · {interview.feedback}</p>
            )}
          </div>
        ))}
        {canEdit && (
          <form onSubmit={event => submit(event, 'interviews/', 'POST', data => ({
            ...data, scheduled_at: new Date(data.scheduled_at).toISOString(),
          }))}>
            <label>Interviewer <select name="interviewer" required defaultValue="">
              <option value="" disabled>Select employee</option>
              {details.interviewers.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select></label>
            <label>Interview time <input name="scheduled_at" type="datetime-local" required /></label>
            <label>Minutes <input name="duration_minutes" type="number" defaultValue="30" min="5" max="480" required /></label>
            <button disabled={busy}>Schedule interview</button>
          </form>
        )}
        <h3>Offer</h3>
        {details.offer && <p>{details.offer.status} · ₹{details.offer.annual_salary_lpa} LPA · Start {details.offer.start_date}</p>}
        {canEdit && (!details.offer || details.offer.status === 'DRAFT') && (
          <form onSubmit={event => submit(event, 'offer/', 'PUT')}>
            <label>Salary in LPA <input name="annual_salary_lpa" type="number" min="0.01" step="0.01" defaultValue={details.offer?.annual_salary_lpa} required /></label>
            <label>Start date <input name="start_date" type="date" defaultValue={details.offer?.start_date} required /></label>
            <button disabled={busy}>Save draft offer</button>
          </form>
        )}
        {canEdit && details.offer && NEXT_OFFER_STATUS[details.offer.status] && (
          <form onSubmit={event => submit(event, 'offer/', 'PUT')}>
            <label>Offer status <select name="status" required defaultValue="">
              <option value="" disabled>Select status</option>
              {NEXT_OFFER_STATUS[details.offer.status].map(status => <option key={status} value={status}>{status}</option>)}
            </select></label>
            <button disabled={busy}>Update offer status</button>
          </form>
        )}
        <h3>Stage history</h3>
        {details.history.length ? (
          <ul>{details.history.map((entry, index) => (
            <li key={index}>{entry.previous_stage} → {entry.new_stage} · {new Date(entry.created_at).toLocaleString()}</li>
          ))}</ul>
        ) : <p>No stage changes recorded.</p>}
      </>}
    </div>
  );
}
