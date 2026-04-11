import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Phone, MapPin, Building, Briefcase,
  Shield, Calendar, Globe, Camera, Edit3
} from 'lucide-react';
import Card from '../../components/common/Card/Card';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import Toast from '../../components/common/Toast/Toast';
import { useApi } from '../../hooks/useApi';
import { useModal } from '../../hooks/useModal';
import styles from './Profile.module.css';

export default function Profile() {
  const sessionUser = JSON.parse(localStorage.getItem('hireflow_user') || '{}');

  const { loading: dataLoading, request: fetchData } = useApi();
  const { loading: updateLoading, request: updateData } = useApi();

  const contactModal = useModal();
  const operationalModal = useModal();

  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
    professional_bio: '',
    work_type: 'ON_SITE',
    email: ''
  });

  const hasPerm = (permCode) => {
    const perms = sessionUser.permissions || [];
    return perms.includes(permCode) || sessionUser.role === 'SuperAdmin' || sessionUser.role_name === 'SuperAdmin';
  };

  const loadProfile = async () => {
    if (!sessionUser.id) return;
    try {
      const data = await fetchData(`/iam/employees/${sessionUser.id}/`);
      setProfile(data);
      if (sessionUser.id === data.id) {
        const mergedUser = { ...sessionUser, ...data };
        localStorage.setItem('hireflow_user', JSON.stringify(mergedUser));
        window.dispatchEvent(new Event('hireflow_user_updated'));
      }
    } catch (e) {
      setToast({ message: "Failed to load profile data.", type: "error" });
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const openContactEdit = () => {
    setFormData({
      ...formData,
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone_number: profile?.phone_number || '',
      street: profile?.profile?.street || '',
      city: profile?.profile?.city || '',
      state: profile?.profile?.state || '',
      zip_code: profile?.profile?.zip_code || '',
      email: profile?.email || ''
    });
    contactModal.open();
  };

  const openOperationalEdit = () => {
    setFormData({
      ...formData,
      professional_bio: profile?.profile?.professional_bio || '',
      work_type: profile?.profile?.work_type || 'ON_SITE'
    });
    operationalModal.open();
  };

  const executeUpdate = async (payload, modalRef) => {
    try {
      await updateData(`/iam/employees/${sessionUser.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setToast({ message: "Profile successfully updated.", type: "success" });
      modalRef.close();
      loadProfile();
    } catch (e) {
      setToast({ message: "Profile update failed.", type: "error" });
    }
  };

  const handleSaveContact = (e) => {
    e.preventDefault();
    executeUpdate({
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number,
      profile: { 
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code
      },
      email: formData.email
    }, contactModal);
  };

  const handleSaveOperational = (e) => {
    e.preventDefault();
    executeUpdate({
      profile: {
        professional_bio: formData.professional_bio,
        work_type: formData.work_type
      }
    }, operationalModal);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate 1:1 format
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width !== img.height) {
        setToast({ message: "Image must be in a 1:1 format (square aspect ratio).", type: "error" });
        return;
      }
      
      setImageUploading(true);
      try {
        const payload = new FormData();
        payload.append('profile.profile_picture', file);
        
        await updateData(`/iam/employees/${sessionUser.id}/`, {
          method: 'PATCH',
          body: payload
        });
        setToast({ message: "Profile picture successfully updated.", type: "success" });
        loadProfile(); // Refresh the profile from API
      } catch (err) {
        setToast({ message: "Failed to upload profile picture.", type: "error" });
      } finally {
        setImageUploading(false);
      }
    };
    img.src = objectUrl;
    
    // Reset file input so user can select the same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!profile && dataLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading profile data...</div>;
  }

  const p = profile || {};
  const rp = p.profile || {};
  const isSelf = sessionUser.id === p.id;
  const canEdit = isSelf || sessionUser.role === 'SuperAdmin';
  
  // Logical Fallback for Name
  const displayName = p.first_name || p.last_name 
    ? `${p.first_name || ''} ${p.last_name || ''}`.trim() 
    : p.email || 'User';

  const formatJoinDate = (dString) => {
    if (!dString) return 'Pending...';
    return new Date(dString).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const fullAddress = [rp.street, rp.city, rp.state, rp.zip_code].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className={styles.profileHeader}>
        <div className={styles.bannerContent}>
          <div className={styles.avatarLarge}>
            {rp.profile_picture ? (
              <img 
                src={rp.profile_picture.startsWith('http') ? rp.profile_picture : `http://localhost:8000${rp.profile_picture}`} 
                alt="Profile" 
                className={styles.avatarImage} 
              />
            ) : (
              displayName.charAt(0)
            )}
            <div 
              className={`${styles.uploadTrigger} ${imageUploading ? styles.uploading : ''}`}
              onClick={() => !imageUploading && fileInputRef.current?.click()}
            >
              <Camera size={18} color="#0f62fe" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
          <div className={styles.headerInfo}>
            <div className={`flex items-center gap-3 ${styles.nameBadgeRow}`}>
              <h1>{displayName}</h1>
              {p.status === 'ACTIVE' ? <Badge variant="success">Active</Badge> : <Badge variant="warning">{p.status}</Badge>}
            </div>
            <p>{p.designation_name || 'No Designation'} at {p.department_name || 'No Department'}</p>
          </div>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <div className="flex flex-col gap-6">
          <Card
            title="Contact Information"
            extra={canEdit && <Button variant="outline" size="small" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={openContactEdit} icon={<Edit3 size={12} />}>Edit</Button>}
          >
            <div className={styles.infoCard}>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><Mail size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Email Address</p>
                  <p className={styles.infoValue}>{p.email || 'N/A'}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><Phone size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Phone Number</p>
                  <p className={styles.infoValue}>{p.phone_number ? `+91 ${p.phone_number}` : 'Not provided'}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><MapPin size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Address</p>
                  <p className={styles.infoValue}>{fullAddress || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </Card>

        </div>

        <div className="flex flex-col gap-6">
          <Card
            title="Organizational Details"
            extra={canEdit && <Button variant="outline" size="small" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={openOperationalEdit} icon={<Edit3 size={12} />}>Edit</Button>}
          >
            <div className={styles.orgCard}>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><Building size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Department</p>
                  <p className={styles.infoValue}>{p.department_name || 'Unassigned'}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><Briefcase size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Designation</p>
                  <p className={styles.infoValue}>{p.designation_name || 'Unassigned'}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><Calendar size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Date Joined</p>
                  <p className={styles.infoValue}>{formatJoinDate(p.date_of_joining)}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.iconCircle}><Globe size={18} /></div>
                <div>
                  <p className={styles.infoLabel}>Work Type</p>
                  <Badge variant="primary">{rp.work_type === 'REMOTE' ? 'Remote' : rp.work_type === 'HYBRID' ? 'Hybrid' : 'On-Site'}</Badge>
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4 className={styles.detailTitle}>Professional Bio</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6' }}>
                {rp.professional_bio || 'No professional bio provided.'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={contactModal.isOpen}
        onClose={contactModal.close}
        title="Update Contact Information"
        footer={(
          <>
            <Button variant="outline" onClick={contactModal.close}>Cancel</Button>
            <Button loading={updateLoading} onClick={handleSaveContact}>Save Changes</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Input
              label="Email Address"
              value={formData.email}
              disabled={!hasPerm('profile:update_email')}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            {!hasPerm('profile:update_email') && (
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, paddingLeft: '0.25rem' }}>
                You are not allowed to edit your email. Contact Admin
              </span>
            )}
          </div>
          <div className={styles.modalGrid2}>
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={e => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={e => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Phone Number</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ padding: '0.65rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRight: 'none', borderRadius: '12px 0 0 12px', fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>+91</span>
              <input
                type="text"
                style={{ padding: '0.78rem 1rem', flex: 1, borderRadius: '0 12px 12px 0', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.8125rem' }}
                value={formData.phone_number}
                onChange={e => setFormData({ ...formData, phone_number: e.target.value.replace(/\D/g, '').substring(0, 10) })}
              />
            </div>
          </div>
          
          <Input
            label="Village / Street / Area"
            value={formData.street}
            onChange={e => setFormData({ ...formData, street: e.target.value })}
          />
          
          <div className={styles.modalGrid3}>
            <Input
              label="City"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
              value={formData.state}
              onChange={e => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="ZIP"
              value={formData.zip_code}
              onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={operationalModal.isOpen}
        onClose={operationalModal.close}
        title="Update Organizational Details"
        footer={(
          <>
            <Button variant="outline" onClick={operationalModal.close}>Cancel</Button>
            <Button loading={updateLoading} onClick={handleSaveOperational}>Save Changes</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <div className={styles.modalGrid2}>
            <Input label="Department" value={p.department_name || ''} disabled={true} onChange={() => { }} />
            <Input label="Designation" value={p.designation_name || ''} disabled={true} onChange={() => { }} />
          </div>
          <div className={styles.modalGrid2}>
            <Input label="Date Joined" value={formatJoinDate(p.date_of_joining)} disabled={true} onChange={() => { }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Work Type</label>
              <select
                style={{ padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fcfdfe', outline: 'none' }}
                value={formData.work_type}
                onChange={e => setFormData({ ...formData, work_type: e.target.value })}
              >
                <option value="ON_SITE">On-Site</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Professional Bio</label>
            <textarea
              style={{ padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fcfdfe', outline: 'none', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              value={formData.professional_bio}
              onChange={e => setFormData({ ...formData, professional_bio: e.target.value })}
            ></textarea>
          </div>
        </div>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
