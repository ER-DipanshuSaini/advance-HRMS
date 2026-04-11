import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, FileText, Database, Target, UserPlus, 
  MapPin, ArrowRight, Briefcase, ChevronLeft, ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import CandidateProfileDrawer from './CandidateProfileDrawer';
import styles from './RecruitmentDetails.module.css';

// Master Pipeline Configuration for this recruitment
const PIPELINE_STAGES = [
  'Shortlist', 
  'Phone Screening', 
  'Technical Interview 1', 
  'Technical Interview 2', 
  'Manager Round', 
  'HR Round', 
  'Hired'
];

const INITIAL_CANDIDATES = [
  { id: 1, name: 'Alice Smith', title: 'React Expert', match: 96, status: 'New', applied: '2 days ago' },
  { id: 2, name: 'Bob Johnson', title: 'Sr. Frontend', match: 88, status: 'Shortlist', applied: '3 days ago' },
  { id: 3, name: 'Charlie Lee', title: 'UI Engineer', match: 74, status: 'Technical Interview 1', applied: '1 week ago' },
  { id: 4, name: 'Diana Prince', title: 'Web Developer', match: 91, status: 'HR Round', applied: '2 weeks ago' },
  { id: 5, name: 'Edward Elric', title: 'Fullstack Dev', match: 45, status: 'New', applied: '1 day ago' },
  { id: 6, name: 'Felix Wright', title: 'Frontend Lead', match: 99, status: 'Phone Screening', applied: '4 days ago' },
];

export default function RecruitmentDetails() {
  const { id } = useParams(); // Should be e.g. REQ-10042
  const navigate = useNavigate();
  
  const [activeMainTab, setActiveMainTab] = useState('Overview');
  const [activePipelineRound, setActivePipelineRound] = useState(PIPELINE_STAGES[0]);
  
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Mock Job Data representing the exact Wizard variables
  const mockJobData = {
    jobId: id || 'REQ-9999',
    title: 'Senior React Developer',
    department: 'Engineering',
    headcount: 2,
    locationMode: 'Hybrid',
    location: 'New York, USA',
    expFrom: 3,
    expTo: 6,
    salaryFrom: 18,
    salaryTo: 24,
    responsibility: "We are seeking a highly skilled Senior React Developer to lead frontend architecture and feature deployment.\n\n- Build high-performance React applications mapping to RESTful APIs.\n- Manage structural state via Redux and React Context.\n- Mentor junior developers and enforce strict code quality through code reviews.\n- Work closely with UI/UX designers to implement premium responsive interfaces.",
    skills: ['React JS', 'TypeScript', 'Redux', 'System Architecture', 'Figma']
  };

  const handleMoveStage = (candidateId, newStage) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStage } : c));
    setSelectedCandidate(prev => prev && prev.id === candidateId ? { ...prev, status: newStage } : prev);
  };

  const toggleRow = (cId) => {
    setSelectedRows(prev => prev.includes(cId) ? prev.filter(i => i !== cId) : [...prev, cId]);
  };

  const handleBulkProcess = () => {
    setCandidates(prev => prev.map(c => 
      selectedRows.includes(c.id) ? { ...c, status: 'Shortlist' } : c
    ));
    setSelectedRows([]); // Clear selection after processing
  };

  const renderJDOverview = () => (
    <div className={styles.jdLayout}>
      <div>
        <div className={styles.jdSection}>
          <h3><FileText size={18}/> Job Responsibilities</h3>
          <div className={styles.jdText}>{mockJobData.responsibility}</div>
        </div>
      </div>
      <div>
        <div className={styles.jdSidebarCard}>
          <div className={styles.infoRow}>
            <label>Location Setup</label>
            <span>{mockJobData.locationMode} ({mockJobData.location})</span>
          </div>
          <div className={styles.infoRow}>
            <label>Experience Required</label>
            <span>{mockJobData.expFrom} - {mockJobData.expTo} Years</span>
          </div>
          <div className={styles.infoRow}>
            <label>Salary Bracket</label>
            <span>₹{mockJobData.salaryFrom}L - ₹{mockJobData.salaryTo}L LPA</span>
          </div>
          <div className={styles.infoRow}>
            <label>Headcount</label>
            <span>{mockJobData.headcount} Openings</span>
          </div>
          <div className={styles.infoRow}>
            <label>Core Skills Required</label>
            <div className={styles.skillTags}>
              {mockJobData.skills.map(s => (
                <span key={s} className={styles.skillTag}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDatabaseTab = () => {
    const list = candidates.filter(c => c.status === 'New');

    return (
      <div className={styles.flexColumnFull}>
        <div className={styles.toolbar}>
          <div className={styles.bulkActionArea}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
              {selectedRows.length} Candidates Selected
            </span>
            {selectedRows.length > 0 && (
              <Button variant="primary" size="sm" icon={<ArrowRight size={14}/>} onClick={handleBulkProcess}>
                Process to Shortlist
              </Button>
            )}
          </div>
          <div>
            <span className={styles.inboxCount}>Total Inbox: {list.length}</span>
          </div>
        </div>
        
        <div className={styles.tableViewport}>
          <table className={styles.candidateTable}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input type="checkbox" />
                </th>
                <th>Candidate Profile</th>
                <th>Applied</th>
                <th>AI Assessment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? list.map(c => (
                <tr key={c.id}>
                  <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedRows.includes(c.id)} onChange={() => toggleRow(c.id)} />
                  </td>
                  <td onClick={() => setSelectedCandidate(c)}>
                    <div className={styles.candidateIdentity}>
                      <div className={styles.avatar}>{c.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                        <div className={styles.candidateTitle}>{c.title}</div>
                      </div>
                    </div>
                  </td>
                  <td onClick={() => setSelectedCandidate(c)}>{c.applied}</td>
                  <td onClick={() => setSelectedCandidate(c)}><span className={styles.cMatch}>{c.match}% Match</span></td>
                  <td onClick={() => setSelectedCandidate(c)}><MoreHorizontal size={16} color="#94a3b8"/></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>No new candidates pending in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>Showing 1 to {list.length} of {list.length} candidates</span>
          <div className={styles.paginationControls}>
            <button className={styles.pageBtn}><ChevronLeft size={16}/></button>
            <button className={styles.pageBtn}><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>
    );
  };

  const renderHiringStageTab = () => {
    const list = candidates.filter(c => c.status === activePipelineRound);
    
    return (
      <div className={styles.flexColumnFull}>
        <div className={styles.stageHeader}>
          <div className={styles.subTabs}>
            {PIPELINE_STAGES.map(stage => {
              const count = candidates.filter(c => c.status === stage).length;
              return (
                <button 
                  key={stage} 
                  className={`${styles.subTab} ${activePipelineRound === stage ? styles.subTabActive : ''}`}
                  onClick={() => setActivePipelineRound(stage)}
                >
                  {stage} <span className={styles.subTabCount}>{count}</span>
                </button>
              );
            })}
          </div>
          <div>
            <Button variant="primary" size="sm" icon={<UserPlus size={14} />}>Add Candidate</Button>
          </div>
        </div>
        
        <div className={styles.tableViewport}>
          <table className={styles.candidateTable}>
            <thead>
              <tr>
                <th>Candidate Profile</th>
                <th>Current Status</th>
                <th>Assessment Match</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? list.map(c => (
                <tr key={c.id} onClick={() => setSelectedCandidate(c)}>
                  <td>
                    <div className={styles.candidateIdentity}>
                      <div className={styles.avatar}>{c.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                        <div className={styles.candidateTitle}>{c.title}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={styles.statusBadgeSmall}>{c.status}</span></td>
                  <td><span className={styles.cMatch}>{c.match}% Match</span></td>
                  <td><MoreHorizontal size={16} color="#94a3b8"/></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <Target size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155' }}>No candidates in {activePipelineRound}</div>
                    <p style={{ marginTop: '0.5rem' }}>Advance candidates into this round to populate this list.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'contents' }}
    >
      {/* Structural Card: Detail Header */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <button className={styles.backBtn} onClick={() => navigate('/recruitment')}>
            <ArrowLeft size={18} />
          </button>
          <div className={styles.headerLeft}>
            <h1>
              {mockJobData.title} 
              <span className={styles.jobIdBadge}>{mockJobData.jobId}</span>
            </h1>
            <div className={styles.meta}>
              <span className={styles.statusBadge}>Strategic Hiring Phase</span>
              <span className={styles.metaItem}><Briefcase size={14}/> {mockJobData.department}</span>
              <span className={styles.metaItem}><MapPin size={14}/> {mockJobData.location}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" icon={<MoreHorizontal size={16} />}>Options</Button>
      </div>

      {/* Main Container - Standalone Structural Card */}
      <div className={styles.contentWrapper}>
        {/* Mirroring Employee Directory's toolbar/tab alignment */}
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.mainTab} ${activeMainTab === 'Overview' ? styles.mainTabActive : ''}`}
            onClick={() => setActiveMainTab('Overview')}
          >
            <FileText size={16}/> Job Intelligence
          </button>
          <button 
            className={`${styles.mainTab} ${activeMainTab === 'Database' ? styles.mainTabActive : ''}`}
            onClick={() => setActiveMainTab('Database')}
          >
            <Database size={16}/> Sourcing Warehouse
          </button>
          <button 
            className={`${styles.mainTab} ${activeMainTab === 'Stage' ? styles.mainTabActive : ''}`}
            onClick={() => setActiveMainTab('Stage')}
          >
            <Target size={16}/> Pipeline Assessment
          </button>
        </div>

        <div className={styles.flexColumnFull}>
          <AnimatePresence mode="wait">
            {activeMainTab === 'Overview' && (
              <motion.div key="ov" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration: 0.15}}>
                {renderJDOverview()}
              </motion.div>
            )}
            {activeMainTab === 'Database' && (
              <motion.div key="db" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration: 0.15}} style={{height:'100%'}}>
                {renderDatabaseTab()}
              </motion.div>
            )}
            {activeMainTab === 'Stage' && (
              <motion.div key="stg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration: 0.15}} style={{height:'100%'}}>
                {renderHiringStageTab()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile Overlay */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateProfileDrawer 
            candidate={selectedCandidate} 
            onClose={() => setSelectedCandidate(null)} 
            pipelineStages={PIPELINE_STAGES}
            onMoveStage={handleMoveStage}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
