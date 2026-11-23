import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import Badge from '../common/Badge/Badge';
import Button from '../common/Button/Button';
import Card from '../common/Card/Card';
import PageState from '../common/PageState';
import styles from './AttendanceClock.module.css';

const recordsPath = '/attendance/records/';

function ClockCard({ todayPath, canMark, onRecorded }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient(todayPath, { signal: controller.signal, cache: 'no-store' })
      .then(setRecord)
      .catch(error => {
        if (!controller.signal.aborted) setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [todayPath, attempt]);

  const checkedIn = Boolean(record?.check_in);
  const checkedOut = Boolean(record?.check_out);
  const status = checkedOut ? 'Checked out' : checkedIn ? 'Checked in' : 'Not checked in';

  async function recordAttendance() {
    if (submitting || checkedOut) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await apiClient(recordsPath + (checkedIn ? 'check-out/' : 'check-in/'), {
        method: 'POST',
        body: '{}',
      });
      setRecord(updated);
      onRecorded?.(updated);
    } catch (error) {
      setActionError(error.message);
      setLoading(true);
      setAttempt(value => value + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Today’s attendance" extra={!loading && !loadError &&
      <Badge variant={checkedOut ? 'info' : checkedIn ? 'success' : 'warning'} role="status">{status}</Badge>}>
      {loading ? <PageState tone="loading" title="Loading today's attendance..." /> : loadError ? (
        <PageState tone="error" title="Could not load today's attendance" action={{
          label: 'Retry',
          run: () => {
            setLoading(true);
            setLoadError(null);
            setAttempt(value => value + 1);
          },
        }}>{loadError}</PageState>
      ) : (
        <>
          <div className={styles.row}>
            <dl className={styles.times}>
              <div><dt>Check-in</dt><dd>{record?.check_in_display || 'Pending'}</dd></div>
              <div><dt>Check-out</dt><dd>{record?.check_out_display || 'Pending'}</dd></div>
            </dl>
            {canMark && !checkedOut && (
              <Button onClick={recordAttendance} loading={submitting}
                icon={checkedIn ? <LogOut size={16} /> : <LogIn size={16} />}>
                {checkedIn ? 'Check out' : 'Check in'}
              </Button>
            )}
          </div>
          {actionError && <p className={styles.error} role="alert">{actionError}</p>}
        </>
      )}
    </Card>
  );
}

export default function AttendanceClock({ user, onRecorded }) {
  const canMark = Boolean(user?.permissions?.includes('attendance:mark_own'));
  const canViewOwn = user?.permissions?.includes('attendance:view_own');
  const canViewAll = user?.permissions?.includes('attendance:view_all');
  if (!user?.id || (!canMark && !canViewOwn && !canViewAll)) return null;

  const query = canMark || canViewOwn ? '' : '?user_id=' + encodeURIComponent(user.id);
  return <ClockCard key={user.id + query} todayPath={recordsPath + 'today/' + query}
    canMark={canMark} onRecorded={onRecorded} />;
}
