import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, ChevronRight, ChevronLeft, 
  Briefcase, FileText, Send 
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Toast from '../../components/common/Toast/Toast';
import { useApi } from '../../hooks/useApi';
import { recruitmentService } from '../../api/recruitmentService';
import styles from './CreateRecruitmentWizard.module.css';

const STEPS = [
  { id: 1, title: 'Role Details', desc: 'Basic info & compensation', icon: Briefcase },
  { id: 2, title: 'Requirements & Flow', desc: 'Skills & interview stages', icon: FileText }
];

export default function CreateRecruitmentWizard({ onClose, onCreate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [skillInput, setSkillInput] = useState('');
  const [departments, setDepartments] = useState([]);
  const [toast, setToast] = useState(null);
  
  const { loading, request } = useApi();
  
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    headcount: '1',
    location: '',
    locationMode: 'ON_SITE',
    expFrom: '',
    expTo: '',
    salaryFrom: '',
    salaryTo: '',
    responsibility: '',
    skills: ['React', 'JavaScript'],
    interviews: ['Shortlist', 'Phone Screening', 'Technical Interview 1']
  });

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await recruitmentService.getDepartments();
        if (data && Array.isArray(data)) {
          setDepartments(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, department: data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const handleNext = () => { if (currentStep < 2) setCurrentStep(c => c + 1); };
  const handleBack = () => { if (currentStep > 1) setCurrentStep(c => c - 1); };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.department) {
        setToast({ message: 'Role Title and Department are required', type: 'error' });
        return;
      }

      const payload = {
        title: formData.title,
        department: formData.department,
        headcount: parseInt(formData.headcount),
        location_mode: formData.locationMode,
        location: formData.location,
        min_experience: parseInt(formData.expFrom) || 0,
        max_experience: parseInt(formData.expTo) || 0,
        min_salary: parseFloat(formData.salaryFrom) || 0,
        max_salary: parseFloat(formData.salaryTo) || 0,
        job_description: formData.responsibility,
        requirements: formData.skills.join(', ')
      };

      const result = await request(null, {
        call: () => recruitmentService.createPosition(payload)
      });

      if (result && result.job_id) {
        setToast({ message: `Successfully created ${result.job_id}`, type: 'success' });
        setTimeout(() => {
          if (onCreate) onCreate(result.job_id);
          else onClose();
        }, 1500);
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !formData.skills.includes(val)) {
        setFormData(prev => ({ ...prev, skills: [...prev.skills, val] }));
      }
      setSkillInput('');
    } else if (e.key === 'Backspace' && !skillInput && formData.skills.length > 0) {
      setFormData(prev => ({ ...prev, skills: prev.skills.slice(0, -1) }));
    }
  };

  const removeSkill = (skill) => setFormData(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));

  const toggleStage = (stage) => {
    setFormData(p => {
      const exists = p.interviews.includes(stage);
      return exists 
        ? { ...p, interviews: p.interviews.filter(s => s !== stage) }
        : { ...p, interviews: [...p.interviews, stage] };
    });
  };

  return (
    <div className={styles.overlay}>
      <motion.div 
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={styles.layout}>
          
          {/* Sidebar Stepper */}
          <div className={styles.stepperSidebar}>
            <div className={styles.stepperHeader}>
              <div className={styles.stepperIcon}><Briefcase size={16} /></div>
              <span>New Pipeline</span>
            </div>

            <div className={styles.stepList}>
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isCompleted ? styles.stepCompleted : ''}`}>
                    <div className={styles.stepIconContainer}>
                      <div className={styles.stepNumber}>
                        {isCompleted ? <Check size={14} /> : step.id}
                      </div>
                      <div className={styles.stepConnector} />
                    </div>
                    <div className={styles.stepContent}>
                      <div className={styles.stepTitle}>{step.title}</div>
                      <div className={styles.stepDesc}>{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Form Area */}
          <div className={styles.mainArea}>
            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>

            <div className={styles.contentBody}>
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Basic Info & Comp */}
                {currentStep === 1 && (
                  <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                    <div className={styles.sectionHeader}>
                      <h2>Role & Details</h2>
                      <p>Establish the baseline data for the recruitment process.</p>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label>Role Name *</label>
                        <input className={styles.inputField} type="text" name="title" placeholder="e.g. Lead Product Designer" value={formData.title} onChange={handleChange} autoFocus />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Department</label>
                        <select className={styles.selectField} name="department" value={formData.department} onChange={handleChange}>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>No. of Openings (Headcount)</label>
                        <input className={styles.inputField} type="number" name="headcount" min="1" value={formData.headcount} onChange={handleChange} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Location Mode</label>
                        <select className={styles.selectField} name="locationMode" value={formData.locationMode} onChange={handleChange}>
                          <option value="ON_SITE">On-Site</option>
                          <option value="HYBRID">Hybrid</option>
                          <option value="REMOTE">Remote</option>
                        </select>
                      </div>
                      <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                          <label>Hiring Location</label>
                          <input className={styles.inputField} type="text" name="location" placeholder="e.g. New York, USA" value={formData.location} onChange={handleChange} />
                        </div>
                      </div>

                      {/* Experience Range */}
                      <div className={styles.fullWidth}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Experience (Years)</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div className={styles.formGroup} style={{ flex: 1 }}>
                            <input className={styles.inputField} type="number" name="expFrom" placeholder="From (e.g. 2)" value={formData.expFrom} onChange={handleChange} />
                          </div>
                          <div className={styles.formGroup} style={{ flex: 1 }}>
                            <input className={styles.inputField} type="number" name="expTo" placeholder="To (e.g. 5)" value={formData.expTo} onChange={handleChange} />
                          </div>
                        </div>
                      </div>

                      {/* Salary Range */}
                      <div className={styles.fullWidth}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Salary Bracket (INR LPA)</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div className={styles.formGroup} style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.875rem' }}>₹</span>
                            <input className={styles.inputField} style={{ paddingLeft: '2rem' }} type="number" name="salaryFrom" placeholder="From limit" value={formData.salaryFrom} onChange={handleChange} />
                          </div>
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>-</span>
                          <div className={styles.formGroup} style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.875rem' }}>₹</span>
                            <input className={styles.inputField} style={{ paddingLeft: '2rem' }} type="number" name="salaryTo" placeholder="To limit" value={formData.salaryTo} onChange={handleChange} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Requirements & Pipeline */}
                {currentStep === 2 && (
                  <motion.div key="st2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                    <div className={styles.sectionHeader}>
                      <h2>Requirements & Workflow</h2>
                      <p>Determine job responsibilities and configure the interview structure.</p>
                    </div>
                    
                    <div className={styles.formGrid}>
                      <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                          <label>Job Responsibility</label>
                          <textarea className={styles.textareaField} name="responsibility" placeholder="Detailed breakdown of daily responsibilities..." value={formData.responsibility} onChange={handleChange} autoFocus />
                        </div>
                      </div>
                      
                      <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                          <label>Technical Skills (Press Enter/Comma to add)</label>
                          <div className={styles.tagContainer}>
                            {formData.skills.map(s => (
                              <span key={s} className={styles.tag}>
                                {s}
                                <button type="button" className={styles.tagRemoveBtn} onClick={() => removeSkill(s)}><X size={12} /></button>
                              </span>
                            ))}
                            <input 
                              className={styles.tagInput}
                              value={skillInput}
                              onChange={e => setSkillInput(e.target.value)}
                              onKeyDown={handleSkillKeyDown}
                              placeholder={formData.skills.length === 0 ? "Type a skill e.g. 'React'..." : ""}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '2.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>SaaS Interview Stages</h4>
                      <div className={styles.formGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {[
                          'Shortlist', 
                          'Phone Screening', 
                          'Technical Interview 1', 
                          'Technical Interview 2', 
                          'Assignment / Technical Round',
                          'Manager Round', 
                          'HR Round', 
                          'Hired'
                        ].map(stage => (
                          <div 
                            key={stage} 
                            onClick={() => toggleStage(stage)}
                            style={{
                              padding: '0.875rem 1rem', border: '1px solid', borderRadius: '10px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s',
                              borderColor: formData.interviews.includes(stage) ? '#3b82f6' : '#cbd5e1',
                              background: formData.interviews.includes(stage) ? '#eff6ff' : 'white',
                              color: formData.interviews.includes(stage) ? '#1e3a8a' : '#64748b',
                              fontWeight: 600, fontSize: '0.8125rem'
                            }}
                          >
                            {formData.interviews.includes(stage) 
                              ? <div style={{width: 18, height: 18, background: '#2563eb', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Check size={12} strokeWidth={3}/></div> 
                              : <div style={{width: 18, height: 18, borderRadius: '4px', border: '2px solid #cbd5e1', background: 'white'}}/>
                            }
                            {stage}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={styles.footer}>
              <div className={styles.footerLeft}>
                {currentStep > 1 && (
                  <Button variant="outline" icon={<ChevronLeft size={16} />} onClick={handleBack}>
                    Previous
                  </Button>
                )}
              </div>
              <div className={styles.footerRight}>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                {currentStep < 2 ? (
                  <Button variant="primary" onClick={handleNext}>
                    Next Step <ChevronRight size={16} />
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    icon={<Send size={15}/>} 
                    onClick={handleSubmit}
                    loading={loading}
                  >
                    Create Recruitment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
