import PageState from '../../components/common/PageState';
import Select from '../../components/common/Select/Select';
import { useEffect, useId, useState } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import { recruitmentService } from '../../api/recruitmentService';
import styles from './CreateRecruitmentWizard.module.css';

const numbers = [
  { name: 'min_experience', label: 'Minimum experience (years)', step: 1 },
  { name: 'max_experience', label: 'Maximum experience (years)', step: 1 },
  { name: 'min_salary', label: 'Minimum salary (LPA)', step: 0.01 },
  { name: 'max_salary', label: 'Maximum salary (LPA)', step: 0.01 },
];

export default function CreateRecruitmentWizard({ onClose, onCreate }) {
  const formId = useId();
  const [departments, setDepartments] = useState(null);
  const [locationMode, setLocationMode] = useState('ON_SITE');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    recruitmentService.getDepartments().then(data => {
      if (active) setDepartments(data || []);
    }).catch(failure => {
      if (active) setError(failure.message);
    });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      ...fields,
      title: fields.title.trim(),
      location: fields.location.trim() || (locationMode === 'REMOTE' ? 'Remote' : ''),
      requirements: [...new Set(fields.requirements.split(',').map(skill => skill.trim()).filter(Boolean))].join(', '),
      headcount: Number(fields.headcount),
      ...Object.fromEntries(numbers.map(field => [field.name, Number(fields[field.name])])),
    };
    if (!payload.title || !payload.location) {
      setError('Enter a job title and location.');
      return;
    }
    if (payload.min_experience > payload.max_experience || payload.min_salary > payload.max_salary) {
      setError('Minimum experience and salary must be at or below their maximums.');
      return;
    }
    setBusy(true);
    try {
      const job = await recruitmentService.createPosition(payload);
      if (job?.job_id) onCreate(job.job_id);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="New job" size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" form={formId} loading={busy} disabled={!departments?.length}>Create job</Button>
      </>}>
      {error && <p className={styles.message} role="alert">{error}</p>}
      {!departments && !error && <PageState tone="loading" title="Loading departments..." />}
      {departments?.length === 0 && <p role="status" className={styles.message}>Create a department before adding a job.</p>}
      <form id={formId} className={styles.form} onSubmit={submit} aria-busy={busy}>
        <Input name="title" label="Job title" required maxLength={255} />
        <Select label="Department" name="department" aria-label="Department" required defaultValue="">
            <option value="" disabled>Select department</option>
            {departments?.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </Select>
        <Input name="headcount" label="Openings" type="number" min="1" step="1" defaultValue="1" required />
        <Select label="Status" name="status" aria-label="Status" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option><option value="ACTIVE">Active</option>
          </Select>
        <Select label="Work arrangement" name="location_mode" aria-label="Work arrangement" value={locationMode}
            onChange={event => setLocationMode(event.target.value)}>
            <option value="ON_SITE">On-site</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option>
          </Select>
        <Input name="location" label="Location" maxLength={255} required={locationMode !== 'REMOTE'} />
        {numbers.map(field => <Input key={field.name} {...field} type="number" min="0" defaultValue="0" required />)}
        <Input as="textarea" name="job_description" label="Job description" rows={4} containerClass={styles.wide} />
        <Input name="requirements" label="Required skills, separated by commas" containerClass={styles.wide} />
      </form>
    </Modal>
  );
}
