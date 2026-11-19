import PageState from '../../components/common/PageState';
import PageLayout from '../../components/common/PageLayout';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import { useOutletContext } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Lock, Plus, ShieldCheck, Save, X, ChevronRight, Info } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useModal } from '../../hooks/useModal';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import Toast from '../../components/common/Toast/Toast';
import styles from './RoleManagement.module.css';

export default function RoleManagement() {
  const { loading: dataLoading, request: fetchData, data } = useApi();
  const { loading: actionLoading, request: apiAction } = useApi();
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const roleModal = useModal();
  const [newRoleName, setNewRoleName] = useState('');
  const [toast, setToast] = useState(null);

  const isSuper = Boolean(useOutletContext()?.is_superuser);

  const loadData = async () => {
    try {
      const [pData, rData] = await Promise.all([
        apiAction('/security/permissions/'),
        apiAction('/security/roles/')
      ]);
      setAllPermissions(pData);
      setRoles(rData);
      if (rData.length > 0 && !activeRole) setActiveRole(rData[0]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const groupedPermissions = useMemo(() => {
    const groups = Object.create(null);
    const humanize = value => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    allPermissions.forEach(permission => {
      const [category, action] = (permission.code || '').split(':');
      const module = permission.module?.trim() || (category && action ? humanize(category) : 'Other');
      const name = permission.name?.trim() || humanize(action || category) || 'Unnamed permission';
      (groups[module] ??= []).push({ ...permission, name });
    });
    return groups;
  }, [allPermissions]);

  const togglePermission = (permId) => {
    if (!activeRole || activeRole.name === 'SuperAdmin') return;
    const isSelected = activeRole.permissions_list.some(p => p.id === permId);
    let updated;
    if (isSelected) {
      updated = activeRole.permissions_list.filter(p => p.id !== permId);
    } else {
      updated = [...activeRole.permissions_list, allPermissions.find(p => p.id === permId)];
    }
    setActiveRole({ ...activeRole, permissions_list: updated });
  };

  const handleSavePerms = async () => {
    try {
      await apiAction(`/security/roles/${activeRole.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          name: activeRole.name,
          permission_ids: activeRole.permissions_list.map(p => p.id)
        })
      });
      setToast({ message: "Role privileges updated successfully!", type: "success" });
      loadData();
    } catch (e) {
      setToast({ message: "Failed to update role", type: "error" });
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    try {
      await apiAction('/security/roles/', {
        method: 'POST',
        body: JSON.stringify({ name: newRoleName, permission_ids: [] })
      });
      setToast({ message: "New security role created successfully!", type: "success" });
      setNewRoleName('');
      roleModal.close();
      loadData();
    } catch (e) {
      setToast({ message: "Failed to create new role", type: "error" });
    }
  };

  return (
    <PageLayout>
      <PageHeader title="Roles and permissions" actions={isSuper && (
          <Button icon={<Plus size={16} />} onClick={() => roleModal.open()}>Create Custom Role</Button>
      )} />

      <div className={styles.workspaceGrid}>

        <Card title="Access Roles">
          <div className="flex flex-col gap-3">
            {dataLoading && !data ? <PageState tone="loading" title="Loading roles..." /> : roles.map(role => {
              const isActive = activeRole?.id === role.id;
              const isLocked = role.name === 'SuperAdmin';
              return (
                <div
                  key={role.id}
                  onClick={() => setActiveRole(role)}
                  className={`${styles.roleRow} ${isActive ? styles.activeRow : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} color={isActive ? 'var(--primary)' : '#94a3b8'} />
                    <p style={{ margin: 0, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary)' : '#1e293b' }}>{role.name}</p>
                  </div>
                  {isLocked ? <Lock size={16} color="#ef4444" title="System Locked" /> : <ChevronRight size={18} color={isActive ? 'var(--primary)' : '#94a3b8'} />}
                </div>
              );
            })}
          </div>
        </Card>

        {activeRole && (
          <Card
            title={`${activeRole.name} Permissions`}
            extra={isSuper ? (
              <Button
                loading={actionLoading}
                onClick={handleSavePerms}
                disabled={activeRole.name === 'SuperAdmin'}
              >
                Save Changes
              </Button>
            ) : null}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {Object.entries(groupedPermissions).sort().map(([module, perms]) => (
                <div key={module}>
                  <h4 className={styles.moduleTitle}>{module}</h4>
                  <div className={styles.permissionGrid}>
                    {perms.map(p => {
                      const isSelected = activeRole.permissions_list.some(ap => ap.id === p.id);
                      const isSuperAdminRole = activeRole.name === 'SuperAdmin';
                      const canEdit = isSuper && !isSuperAdminRole;
                      return (
                        <div
                          key={p.id}
                          className={`${styles.permCard} ${isSelected ? styles.permActive : ''}`}
                          onClick={() => canEdit && togglePermission(p.id)}
                        >
                          <label className={styles.permLabel} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected || isSuperAdminRole}
                              disabled={!canEdit}
                              onChange={() => togglePermission(p.id)}
                            />
                            <span className={styles.permName}>{p.name}</span>
                          </label>
                          <div className={styles.infoWrapper} title={p.description}>
                            <Info size={14} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={roleModal.isOpen}
        onClose={roleModal.close}
        title="Create New Role"
        footer={(
          <>
            <Button variant="outline" onClick={roleModal.close}>Cancel</Button>
            <Button loading={actionLoading} onClick={handleAddRole}>Create Role</Button>
          </>
        )}
      >
        <Input
          label="Role Name"
          placeholder="e.g. Project Manager"
          value={newRoleName}
          onChange={e => setNewRoleName(e.target.value)}
          required
        />
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}
