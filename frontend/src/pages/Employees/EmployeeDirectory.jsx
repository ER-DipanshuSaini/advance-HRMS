import { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Mail, ShieldCheck, Building2, UserCircle,
  Search, Filter, CheckCircle2, Copy, ExternalLink, Calendar,
  Phone, Hash, MoreVertical, UserPlus, Fingerprint, AlertCircle,
  ChevronDown, X
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useModal } from '../../hooks/useModal';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Badge from '../../components/common/Badge/Badge';
import Modal from '../../components/common/Modal/Modal';
import Toast from '../../components/common/Toast/Toast';
import styles from './EmployeeDirectory.module.css';

export default function EmployeeDirectory() {
  const { loading: loadingEmployees, request: fetchEmployees } = useApi();
  const { loading: creating, request: createEmployee } = useApi();
  const { request: fetchMeta } = useApi();

  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [employeesData, setEmployeesData] = useState(null);
  const employeeModal = useModal();
  const [meta, setMeta] = useState({ depts: [], desigs: [], roles: [] });

  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
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

  const storedUser = JSON.parse(localStorage.getItem('hireflow_user') || '{}');
  const userPerms = storedUser.permissions || [];
  const isSuper = storedUser.role_name === 'SuperAdmin' || storedUser.role === 'SuperAdmin';
  const hasPerm = (code) => isSuper || userPerms.includes(code);

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
        fetchMeta('/security/roles/')
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

  const stats = useMemo(() => ({
    total: employeesData?.count || employeesList.length,
    active: employeesList.filter(e => e.status === 'ACTIVE').length,
    exited: employeesList.filter(e => e.status === 'EXITED').length
  }), [employeesData, employeesList]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setToast({ message: `${label} copied to clipboard!`, type: 'success' });
  };

  return (
    <>

      {/* Refined Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>Employee Directory</h1>
          <p className={styles.headerDesc}>Professional lifecycle management for the modern workforce.</p>
        </div>
        {hasPerm('users:add') && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setCreatedEmp(null); employeeModal.open(); }}>
            Onboard Employee
          </Button>
        )}
      </div>

      {/* Modern Stats Strip */}
      <div className={styles.metricsStrip}>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#eff6ff' }}>
            <Users size={18} color="#2563eb" />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Workforce</span>
            <span className={styles.metricValue}>{stats.total}</span>
          </div>
        </div>
        <div className={styles.metricDivider}></div>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#ecfdf5' }}>
            <div className={styles.statusPing}></div>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Active Identity</span>
            <span className={styles.metricValue} style={{ color: '#059669' }}>{stats.active}</span>
          </div>
        </div>
        <div className={styles.metricDivider}></div>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#fffbeb' }}>
            <ExternalLink size={16} color="#d97706" />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Archived / Exited</span>
            <span className={styles.metricValue}>{stats.exited}</span>
          </div>
        </div>
      </div>

      <Card noPadding shadow="sm" className={styles.mainContainer}>
        {/* Advanced Toolbar System */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchContainer}>
              <Search size={16} className={styles.searchIcon} />
              <input
                placeholder="Search by name, ID, or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.mainSearch}
              />
            </div>
            <button
              className={`${styles.filterToggle} ${showFilters ? styles.filterActive : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} />
              <span>Deep Filter</span>
              <ChevronDown size={14} className={showFilters ? styles.rotate180 : ''} />
            </button>
          </div>

          {(filters.role || filters.department || filters.status) && (
            <button className={styles.clearFilters} onClick={() => setFilters({ role: '', department: '', status: '' })}>
              Reset Filters
            </button>
          )}
        </div>

        {/* Collapsible Deep Filter Bar */}
        {showFilters && (
          <div className={styles.deepFilterBar}>
            <div className={styles.filterGrid}>
              <div className={styles.filterItem}>
                <label>Department</label>
                <select value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })}>
                  <option value="">All Departments</option>
                  {meta.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className={styles.filterItem}>
                <label>Security Role</label>
                <select value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })}>
                  <option value="">All Roles</option>
                  {meta.roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className={styles.filterItem}>
                <label>Employment Status</label>
                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="EXITED">Exited</option>
                  <option value="BLACKLIST">Blacklist</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className={styles.tableResponsive}>
          <table className={styles.saasTable}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th style={{ width: '130px' }}>Employee ID</th>
                <th>Identity & Contact</th>
                <th>Work Domain</th>
                <th>Joining Date</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, index) => (
                  <tr key={emp.id}>
                    <td className={styles.serialCell}>{index + 1}</td>
                    <td>
                      <span className={styles.themeEmpId}>{emp.employee_id || '---'}</span>
                    </td>
                    <td>
                      <div className={styles.identityCell}>
                        <div className={styles.miniAvatar}>
                          {emp.profile?.profile_picture ? (
                            <img 
                              src={emp.profile.profile_picture.startsWith('http') ? emp.profile.profile_picture : `http://localhost:8000${emp.profile.profile_picture}`} 
                              alt={getEmpName(emp)} 
                              className={styles.avatarImage} 
                            />
                          ) : (
                            getEmpName(emp).charAt(0)
                          )}
                        </div>
                        <div className={styles.identityText}>
                          <span className={styles.fullName}>{getEmpName(emp)}</span>
                          <span className={styles.metaEmail}>{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.domainStack}>
                        <span className={styles.primaryDesig}>{emp.designation_name}</span>
                        <span className={styles.secondaryDept}>{emp.department_name}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.dateCell}>
                        <Calendar size={12} color="#94a3b8" />
                        <span>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB') : '---'}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.roleLabel} style={{ color: emp.role_name === 'SuperAdmin' ? '#ef4444' : '#0f62fe' }}>
                        <ShieldCheck size={12} />
                        <span>{emp.role_name}</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'dark'}>{emp.status}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.moreActions}><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={styles.emptyState}>
                    <div className={styles.emptyContent}>
                      <div className={styles.emptyIcon}><AlertCircle size={40} /></div>
                      <h3>No matching employees found</h3>
                      <p>Adjust your filters or search query to find who you're looking for.</p>
                      <Button variant="outline" onClick={() => { setSearch(''); setFilters({ role: '', department: '', status: '' }); }}>Clear All Filters</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Pagination Controls */}
          {employeesData && employeesData.count > 0 && (
            <div className={styles.paginationControls} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid #e2e8f0', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing page {page} (Total {employeesData.count} items)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={!employeesData.previous}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPage(p => p + 1)} 
                  disabled={!employeesData.next}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

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
                  <div className={styles.field}>
                    <label>First Name</label>
                    <input placeholder="e.g. Rajan" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required className={styles.proInput} />
                  </div>
                  <div className={styles.field}>
                    <label>Last Name</label>
                    <input placeholder="e.g. Kumar" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={styles.proInput} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Organizational Email</label>
                    <input placeholder="rjk@hireflow.com" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required className={styles.proInput} />
                  </div>
                  <div className={styles.field}>
                    <label>Contact Number</label>
                    <div className={styles.prefixedInput}>
                      <span className={styles.inputPrefix}>+91</span>
                      <input
                        placeholder="98XXXXXXXX"
                        value={formData.phone_number}
                        onChange={e => {
                          // Strip any non-digit characters
                          const digits = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, phone_number: digits });
                        }}
                        onKeyDown={e => {
                          // Block non-numeric keys (allow backspace, delete, arrows, tab)
                          const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
                          if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        maxLength={10}
                        minLength={10}
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        title="Enter a valid 10-digit mobile number"
                        className={styles.proInput}
                      />
                    </div>
                  </div>
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
                  <div className={styles.field}>
                    <label>Operating Department</label>
                    <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required className={styles.proSelect}>
                      <option value="">Select Domain...</option>
                      {meta.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Job Designation</label>
                    <select value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} required className={styles.proSelect}>
                      <option value="">Select Title...</option>
                      {meta.desigs.filter(d => d.department === parseInt(formData.department)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Access System Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} required className={styles.proSelect}>
                      <option value="">Choose Policy Group...</option>
                      {meta.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Official Date of Joining</label>
                    <input type="date" value={formData.date_of_joining} onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })} required className={styles.proInput} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.onboardFooter}>
              <Button variant="ghost" onClick={employeeModal.close}>Dismiss</Button>
              <Button loading={creating} type="submit" className={styles.submitBtn}>
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
                      src={createdEmp.profile.profile_picture.startsWith('http') ? createdEmp.profile.profile_picture : `http://localhost:8000${createdEmp.profile.profile_picture}`} 
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
    </>
  );
}
