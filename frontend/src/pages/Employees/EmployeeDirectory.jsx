import PageLayout from '../../components/common/PageLayout';
import Select from '../../components/common/Select/Select';
import { useOutletContext } from 'react-router-dom';
import { hasPermission } from '../../session';
import DataTable from '../../components/common/DataTable/DataTable';
import TableToolbar from '../../components/common/DataTable/TableToolbar';
import MetricStrip from '../../components/common/MetricStrip/MetricStrip';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import { resolveMediaUrl } from '../../api/apiClient';
import { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Mail, ShieldCheck, Building2, UserCircle,
  CheckCircle2, Copy, ExternalLink, Calendar,
  Phone, Hash, UserPlus, Fingerprint, AlertCircle,
  X
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useModal } from '../../hooks/useModal';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Badge from '../../components/common/Badge/Badge';
import Modal from '../../components/common/Modal/Modal';
import Toast from '../../components/common/Toast/Toast';
import styles from './EmployeeDirectory.module.css';

export default function EmployeeDirectory() {
  const { loading: loadingEmployees, error: employeesError, request: fetchEmployees } = useApi();
  const { loading: creating, request: createEmployee } = useApi();
  const { request: fetchMeta } = useApi();

  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [employeesData, setEmployeesData] = useState(null);
  const employeeModal = useModal();
  const [meta, setMeta] = useState({ depts: [], desigs: [], roles: [] });

  // Advanced Filter State
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    status: ''
  });

  // Onboarding Form State
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone_number: '',
    department: '', designation: '', role: '',
    date_of_joining: new Date().toISOString().split('T')[0]
  });

  const [createdEmp, setCreatedEmp] = useState(null);

  // Resolve designation name from response OR from local meta (fallback)
  const getDesigName = (emp) => {
    if (!emp) return '—';
    if (emp.designation_name) return emp.designation_name;
    // Fallback: look up in local meta by ID
    const found = meta.desigs.find(d => d.id === emp.designation || d.id === parseInt(emp.designation));
    return found?.name || '—';
  };

  const getEmpName = (emp) => {
    if (!emp) return '—';
    return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email;
  };

  const user = useOutletContext();
  const isSuper = Boolean(user?.is_superuser);
  const hasPerm = code => hasPermission(user, code);

  const loadData = async (pageNum = 1) => {
    try {
      const res = await fetchEmployees(`/iam/employees/?page=${pageNum}`);
      setEmployeesData(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMeta = async () => {
    try {
      const [d, ds, r] = await Promise.all([
        fetchMeta('/org/departments/'),
        fetchMeta('/org/designations/'),
        hasPerm('roles:view') ? fetchMeta('/security/roles/') : Promise.resolve([])
      ]);
      setMeta({ depts: d, desigs: ds, roles: r });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData(page);
  }, [page]);
  
  useEffect(() => {
    loadMeta();
  }, []);

  const handleOnboard = async (e) => {
    e.preventDefault();
    try {
      const { firstName, lastName, ...rest } = formData;
      const submissionData = {
        ...rest,
        role: isSuper ? (rest.role || null) : null,
        first_name: firstName.trim(),
        last_name: lastName.trim()
      };

      const res = await createEmployee('/iam/employees/', {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });

      if (res && res.id) {
        setCreatedEmp(res);
        setToast({ message: 'Personnel identity established successfully!', type: 'success' });
        loadData(page); // refresh the list separately
        setFormData({
          firstName: '', lastName: '', email: '', phone_number: '',
          department: '', designation: '', role: '',
          date_of_joining: new Date().toISOString().split('T')[0]
        });
      } else {
        setToast({ message: 'Submission failed — please verify all required fields.', type: 'error' });
      }
    } catch (err) {
      const errMsg = err?.detail || err?.email?.[0] || err?.first_name?.[0] || err?.last_name?.[0] || 'Deployment failed. Please try again.';
      setToast({ message: errMsg, type: 'error' });
    }
  };

  const employeesList = Array.isArray(employeesData) ? employeesData : (employeesData?.results || []);
  
  const filteredEmployees = useMemo(() => {
    return employeesList.filter(u => {
      const s = search.toLowerCase();
      const matchesSearch = !search || (
        getEmpName(u).toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.employee_id?.toLowerCase().includes(s)
      );

      const matchesRole = !filters.role || u.role_name === filters.role;
      const matchesDept = !filters.department || u.department === parseInt(filters.department);
      const matchesStatus = !filters.status || u.status === filters.status;

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [employeesList, search, filters]);

  const stats = {
    total: employeesData?.count ?? employeesList.length,
    active: employeesList.filter(employee => employee.status === 'ACTIVE').length,
    exited: employeesList.filter(employee => employee.status === 'EXITED').length,
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setToast({ message: `${label} copied to clipboard!`, type: 'success' });
  };

  function clearFilters() {
    setSearch('');
    setFilters({ role: '', department: '', status: '' });
  }


  const canAddEmployee = hasPerm('users:add');
  const openEmployeeForm = () => { setCreatedEmp(null); employeeModal.open(); };

  const columns = [
    { key: 'number', label: 'S.No', width: '60px', render: (_, index) => index + 1 },
    { key: 'id', label: 'Employee ID', width: '130px', render: employee =>
      <span className={styles.themeEmpId}>{employee.employee_id || '—'}</span> },
    { key: 'identity', label: 'Employee', render: employee => {
      const name = getEmpName(employee);
      const picture = resolveMediaUrl(employee.profile?.profile_picture);
      return <div className={styles.identityCell}>
        <span className={styles.miniAvatar} aria-hidden="true">
          {picture ? <img src={picture} alt="" className={styles.avatarImage} /> : name.charAt(0)}
        </span>
        <span className={styles.identityText}>
          <strong className={styles.fullName}>{name}</strong>
          <span className={styles.metaEmail}>{employee.email}</span>
        </span>
      </div>;
    } },
    { key: 'designation', label: 'Designation and department', render: employee => <div className={styles.domainStack}>
      <span className={styles.primaryDesig}>{employee.designation_name}</span>
      <span className={styles.secondaryDept}>{employee.department_name}</span>
    </div> },
    { key: 'date', label: 'Joining Date', render: employee => <span className={styles.dateCell}>
      <Calendar size={12} aria-hidden="true" />{employee.date_of_joining ?
        new Date(employee.date_of_joining + 'T00:00:00').toLocaleDateString('en-GB') : '—'}
    </span> },
    { key: 'role', label: 'Role', render: employee => <span className={styles.roleLabel}>
      <ShieldCheck size={12} aria-hidden="true" />{employee.role_name}
    </span> },
    { key: 'status', label: 'Status', render: employee =>
      <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'info'}>{employee.status}</Badge> },
  ];
  const filterFields = [
    { key: 'department', label: 'Department', options: [{ value: '', label: 'All departments' },
      ...meta.depts.map(department => ({ value: String(department.id), label: department.name }))] },
    { key: 'role', label: 'Security Role', options: [{ value: '', label: 'All roles' },
      ...meta.roles.map(role => ({ value: role.name, label: role.name }))] },
    { key: 'status', label: 'Employment Status', options: [{ value: '', label: 'All statuses' },
      ...['Active', 'Inactive', 'Exited', 'Blacklist'].map(label => ({ value: label.toUpperCase(), label }))] },
  ].map(field => ({
    ...field, value: filters[field.key],
    onChange: value => setFilters(current => ({ ...current, [field.key]: value })),
  }));

  return (
    <PageLayout>
      <PageHeader title="Employee Directory" actions={canAddEmployee &&
        <Button icon={<Plus size={16} />} onClick={openEmployeeForm}>Add employee</Button>} />
      <MetricStrip loading={!employeesData && !employeesError} error={!employeesData && employeesError} metrics={[
        { label: 'Total Employees', value: stats.total, Icon: Users },
        { label: 'Active on This Page', value: stats.active, Icon: UserCircle, tone: 'success' },
        { label: 'Exited on This Page', value: stats.exited, Icon: ExternalLink, tone: 'warning' },
      ]} />
      <DataTable label="Employees" columns={columns} rows={filteredEmployees} rowKey={employee => employee.id}
        loading={loadingEmployees || (!employeesData && !employeesError)} error={employeesError} onRetry={() => loadData(page)}
        empty={employeesData?.count > 0 && (search.trim() || Object.values(filters).some(Boolean)) ? {
          tone: 'filtered', title: 'No employees match these filters',
          description: 'Adjust your filters or search query.',
          action: { label: 'Clear filters', run: clearFilters },
        } : {
          title: 'No employees yet',
          description: canAddEmployee ? 'Add your first employee to start building the directory.' : 'Employees will appear here once they are added.',
          icon: Users,
          action: canAddEmployee && { label: 'Add employee', icon: <Plus size={15} />, run: openEmployeeForm },
        }}
        pagination={employeesData && {
          page, total: employeesData.count, hasPrevious: Boolean(employeesData.previous), hasNext: Boolean(employeesData.next),
          onPrevious: () => setPage(value => Math.max(1, value - 1)), onNext: () => setPage(value => value + 1),
        }}
        toolbar={<TableToolbar search={search} onSearch={setSearch} searchLabel="Search employees on this page"
          placeholder="Search this page by name, ID or email" filters={filterFields} onReset={clearFilters} />} />

      {/* Professional Onboarding Modal */}
      <Modal
        isOpen={employeeModal.isOpen}
        onClose={employeeModal.close}
        title={createdEmp ? "Credentials Generated" : "Employee Onboarding"}
        size="lg"
      >
        {!createdEmp ? (
          <form onSubmit={handleOnboard} className={styles.onboardWrapper}>

            {/* Group 1: Identity */}
            <div className={styles.formGroup}>
              <div className={styles.groupHead}>
                <UserCircle size={18} />
                <h4>Workforce Identity</h4>
              </div>
              <div className={styles.groupContent}>
                <div className={styles.fieldRow}>
                  <Input label="First Name" placeholder="e.g. Rajan" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                  <Input label="Last Name" placeholder="e.g. Kumar" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
                <div className={styles.fieldRow}>
                  <Input label="Organizational Email" placeholder="rjk@hireflow.com" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  <Input label="Contact Number (+91)" type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}"
                    placeholder="98XXXXXXXX" value={formData.phone_number}
                    onChange={event => setFormData(current => ({
                      ...current, phone_number: event.target.value.replace(/\D/g, '').slice(0, 10),
                    }))} />
                </div>
              </div>
            </div>

            <div className={styles.groupDivider}></div>

            {/* Group 2: Organizational */}
            <div className={styles.formGroup}>
              <div className={styles.groupHead}>
                <Building2 size={18} />
                <h4>Organizational Assignment</h4>
              </div>
              <div className={styles.groupContent}>
                <div className={styles.fieldRow}>
                  <Select label="Operating Department" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required>
                      <option value="">Select Domain...</option>
                      {meta.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                  <Select label="Job Designation" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} required>
                      <option value="">Select Title...</option>
                      {meta.desigs.filter(d => d.department === parseInt(formData.department)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                </div>
                <div className={styles.fieldRow}>
                  <Select label="Access System Role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} disabled={!isSuper}>
                      <option value="">Default employee access</option>
                      {meta.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                  <Input label="Official Date of Joining" type="date" value={formData.date_of_joining} onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })} required />
                </div>
              </div>
            </div>

            <div className={styles.onboardFooter}>
              <Button variant="ghost" onClick={employeeModal.close}>Dismiss</Button>
              <Button loading={creating} type="submit">
                Add Employee
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.successContainer}>

            {/* Success Banner */}
            <div className={styles.successBanner}>
              <div className={styles.successCircle}>
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h3 className={styles.successTitle}>Employee Onboarded Successfully</h3>
                <p className={styles.successSub}>The employee profile has been created and login credentials have been generated.</p>
              </div>
            </div>

            {/* Employee Card — clean, professional, light design */}
            <div className={styles.empCard}>
              {/* Card Top Strip */}
              <div className={styles.empCardTop}>
                <div className={styles.empCardAvatar}>
                  {createdEmp.profile?.profile_picture ? (
                    <img 
                      src={resolveMediaUrl(createdEmp.profile.profile_picture)}
                      alt={getEmpName(createdEmp)} 
                      className={styles.avatarImage} 
                    />
                  ) : (
                    getEmpName(createdEmp)?.charAt(0)
                  )}
                </div>
                <div>
                  <div className={styles.empCardName}>{getEmpName(createdEmp)}</div>
                  <div className={styles.empCardDesig}>{getDesigName(createdEmp)}</div>
                </div>
                <div className={styles.empCardIdPill}>{createdEmp.employee_id}</div>
              </div>

              {/* Fields Grid */}
              <div className={styles.empCardGrid}>
                <div className={styles.empCardField}>
                  <span className={styles.fieldKey}>Full Name</span>
                  <span className={styles.fieldVal}>{getEmpName(createdEmp)}</span>
                </div>
                <div className={styles.empCardField}>
                  <span className={styles.fieldKey}>Employee ID</span>
                  <span className={styles.fieldVal} style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 800 }}>{createdEmp.employee_id}</span>
                </div>
                <div className={styles.empCardField}>
                  <span className={styles.fieldKey}>Work Email</span>
                  <span className={styles.fieldVal}>{createdEmp.email}</span>
                </div>
                <div className={styles.empCardField}>
                  <span className={styles.fieldKey}>Designation</span>
                  <span className={styles.fieldVal}>{getDesigName(createdEmp)}</span>
                </div>
                <div className={styles.empCardField} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.fieldKey}>Temporary Password</span>
                  <div className={styles.passRow}>
                    <span className={styles.fieldVal} style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#0f62fe', letterSpacing: '0.05em' }}>
                      {createdEmp.generated_password}
                    </span>
                    <button className={styles.copyBtn} onClick={() => copyToClipboard(createdEmp.generated_password, 'Password')}>
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>
              </div>

              <p className={styles.empCardNote}>
                Please share these credentials securely with the employee. They will be prompted to change their password upon first login.
              </p>
            </div>

            <div className={styles.successActions}>
              <Button variant="outline" style={{ flex: 1 }} onClick={employeeModal.close}>Close</Button>
              <Button style={{ flex: 1 }} icon={<Copy size={14} />} onClick={() => copyToClipboard(`Name: ${getEmpName(createdEmp)}\nID: ${createdEmp.employee_id}\nEmail: ${createdEmp.email}\nPassword: ${createdEmp.generated_password}`, 'Credentials')}>
                Copy Credentials
              </Button>
            </div>
          </div>
        )}

      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}
