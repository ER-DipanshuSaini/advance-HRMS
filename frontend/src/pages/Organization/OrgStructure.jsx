import { useState, useEffect, useMemo } from 'react';
import { Building2, Plus, Edit2, ChevronRight, User, Users as UsersIcon, ShieldCheck, Hash } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useModal } from '../../hooks/useModal';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Badge from '../../components/common/Badge/Badge';
import Modal from '../../components/common/Modal/Modal';
import Toast from '../../components/common/Toast/Toast';
import styles from './OrgStructure.module.css';

export default function OrgStructure() {
  const { loading: deptsLoading, request: fetchDepts, data: departments } = useApi();
  const { request: fetchUsers, data: users } = useApi();
  const { loading: actionLoading, request: apiAction } = useApi();

  const [activeDept, setActiveDept] = useState(null);
  const deptModal = useModal();
  const desigModal = useModal();

  const [formData, setFormData] = useState({ name: '', code: '', hod: '' });
  const [editingItem, setEditingItem] = useState(null); // { type: 'dept'|'desig', data: obj }
  const [toast, setToast] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem('hireflow_user') || '{}');
  const userPerms = storedUser.permissions || [];
  const isSuper = storedUser.role_name === 'SuperAdmin' || storedUser.role === 'SuperAdmin';
  const hasPerm = (code) => isSuper || userPerms.includes(code);

  const loadData = async () => {
    try {
      const data = await fetchDepts('/org/departments/');
      await fetchUsers('/iam/employees/');

      setActiveDept(prev => {
        if (!prev && data?.length > 0) return data[0];
        if (prev && data?.length > 0) {
          const updated = data.find(d => d.id === prev.id);
          return updated || data[0];
        }
        return prev;
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  // Helper to generate unique codes (e.g. SD01)
  const generateCode = (name, type = 'dept') => {
    if (!name) return '';
    const words = name.trim().split(/\s+/);
    let initials = '';
    if (words.length >= 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else {
      initials = name.slice(0, 2).toUpperCase();
    }

    // Find collisions and increment
    const existing = type === 'dept'
      ? (departments || []).map(d => d.dept_id)
      : (activeDept?.designations || []).map(d => d.designation_code);

    let count = 1;
    let code = `${initials}${String(count).padStart(2, '0')}`;
    while (existing.includes(code)) {
      count++;
      code = `${initials}${String(count).padStart(2, '0')}`;
    }
    return code;
  };

  const handleNameChange = (name, type) => {
    const code = generateCode(name, type);
    setFormData(prev => ({ ...prev, name, code }));
  };

  const handleAddDept = async (e) => {
    e.preventDefault();
    try {
      await apiAction('/org/departments/', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          dept_id: formData.code,
          hod: formData.hod || null
        })
      });
      setFormData({ name: '', code: '', hod: '' });
      deptModal.close();
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleAddDesig = async (e) => {
    e.preventDefault();
    try {
      await apiAction('/org/designations/', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          designation_code: formData.code,
          department: activeDept.id
        })
      });
      setToast({ message: 'Designation created successfully', type: 'success' });
      setFormData({ name: '', code: '', hod: '' });
      desigModal.close();
      loadData();
    } catch (e) {
      setToast({ message: 'Failed to create designation', type: 'error' });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const isDept = editingItem.type === 'dept';
    const url = isDept ? `/org/departments/${editingItem.data.id}/` : `/org/designations/${editingItem.data.id}/`;

    try {
      await apiAction(url, {
        method: 'PATCH',
        body: JSON.stringify(isDept ? { hod: formData.hod || null } : { name: formData.name })
      });
      setToast({ message: `${isDept ? 'Department' : 'Designation'} updated successfully`, type: 'success' });
      isDept ? deptModal.close() : desigModal.close();
      setEditingItem(null);
      loadData();
    } catch (e) {
      setToast({ message: 'Update failed', type: 'error' });
    }
  };

  const openEdit = (item, type) => {
    setEditingItem({ type, data: item });
    setFormData({
      name: item.name,
      code: type === 'dept' ? item.dept_id : item.designation_code,
      hod: item.hod || ''
    });
    type === 'dept' ? deptModal.open() : desigModal.open();
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Organization Workspace</h1>
          <p className={styles.headerDesc}>Define departments, establish HODs, and manage hierarchical designations.</p>
        </div>
        {hasPerm('depts:add') && (
          <Button icon={<Plus size={16} />} onClick={() => { setFormData({ name: '', code: '', hod: '' }); deptModal.open(); }}>
            New Department
          </Button>
        )}
      </header>

      <div className={styles.workspaceGrid}>

        {/* Department Sidebar */}
        <Card title="Structural Units" noPadding>
          <div className="flex flex-col">
            {(departments || []).map(dept => {
              const isActive = activeDept?.id === dept.id;
              return (
                <div
                  key={dept.id}
                  onClick={() => setActiveDept(dept)}
                  className={`${styles.deptRow} ${isActive ? styles.activeRow : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={styles.deptIconBox}>
                      <span className={styles.deptIdBadge}>{dept.dept_id}</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, color: isActive ? 'var(--primary)' : '#1e293b' }}>{dept.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} /> {dept.hod_name || 'No HOD'}
                        </span>
                        {isActive && hasPerm('depts:update') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(dept, 'dept'); }}
                            className="flex items-center text-blue-600 hover:text-blue-800"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                        <span className={styles.dot}></span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UsersIcon size={12} /> {dept.employee_count} Employees
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} color={isActive ? 'var(--primary)' : '#cbd5e1'} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Designations View */}
        {activeDept && (
          <div className="flex flex-col gap-6">
            <Card
              title={`${activeDept.name} Hierarchies`}
              extra={hasPerm('desig:add') ? <Button variant="outline" icon={<Plus size={16} />} onClick={() => { setFormData({ name: '', code: '', hod: '' }); desigModal.open(); }}>Add Designation</Button> : null}
            >
              <div className={styles.designationGrid}>
                {activeDept.designations?.length > 0 ? activeDept.designations.map(desig => (
                  <div key={desig.id} className={styles.desigCard}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="primary" style={{ fontSize: '0.65rem' }}>{desig.designation_code}</Badge>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UsersIcon size={12} /> {desig.employee_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={styles.iconCircle}><ShieldCheck size={14} /></div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>{desig.name}</p>
                        </div>
                        {hasPerm('desig:update') && (
                          <button
                            onClick={() => openEdit(desig, 'desig')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', transition: 'color 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'}
                            onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <ShieldCheck size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>No designations formulated yet.</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>Create the foundational roles for this department.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      <Modal
        isOpen={deptModal.isOpen}
        onClose={() => { deptModal.close(); setEditingItem(null); }}
        title={editingItem ? "Update Department Head" : "Create Department"}
        footer={(
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { deptModal.close(); setEditingItem(null); }}>Cancel</Button>
            <Button loading={actionLoading} onClick={editingItem ? handleUpdate : handleAddDept}>
              {editingItem ? "Update HOD" : "Finalize Department"}
            </Button>
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Department Name"
            placeholder="e.g. Talent Acquisition"
            value={formData.name}
            onChange={e => handleNameChange(e.target.value, 'dept')}
            disabled={editingItem}
            required
          />
          <Input
            label="Unique ID"
            placeholder="SD01"
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            icon={<Hash size={14} />}
            disabled={editingItem}
            required
          />
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Head of Department (Optional)</label>
            <select
              className={styles.select}
              value={formData.hod}
              onChange={e => setFormData({ ...formData, hod: e.target.value })}
            >
              <option value="">Select HOD...</option>
              {(users?.results || users || []).map(u => (
                <option key={u.id} value={u.id}>
                  {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed'} - ({u.employee_id || u.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Add Designation Modal */}
      <Modal
        isOpen={desigModal.isOpen}
        onClose={() => { desigModal.close(); setEditingItem(null); }}
        title={editingItem ? `Edit Designation: ${editingItem.data.designation_code}` : `New Designation for ${activeDept?.name}`}
        footer={(
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { desigModal.close(); setEditingItem(null); }}>Cancel</Button>
            <Button loading={actionLoading} onClick={editingItem ? handleUpdate : handleAddDesig}>
              {editingItem ? "Save Changes" : "Create Designation"}
            </Button>
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Job Title"
            placeholder="e.g. Lead Developer"
            value={formData.name}
            onChange={e => {
              if (editingItem) setFormData({ ...formData, name: e.target.value });
              else handleNameChange(e.target.value, 'desig');
            }}
            required
          />
          <Input
            label="Designation Code"
            placeholder="LDEV01"
            value={formData.code}
            disabled={editingItem}
            icon={<Hash size={14} />}
            required
          />
        </div>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
