import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Search, Filter, Briefcase, 
  TrendingUp, Users, Clock, AlertCircle, MapPin, ExternalLink
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import CreateRecruitmentWizard from './CreateRecruitmentWizard';
import styles from './RecruitmentDashboard.module.css';

// MOCK_RECORDS preserved for simplicity in this structural update
const MOCK_RECORDS = [
  { 
    id: 1, jobId: 'REQ-10042', role: 'Senior React Developer', department: 'Engineering', 
    status: 'Active', openedOn: 'Apr 02, 2026',
    headcount: 2, locationMode: 'Hybrid', location: 'New York, USA', salaryBand: '₹18L - ₹24L',
    pipeline: { new: 45, processing: 17, final: 2 }
  },
  { 
    id: 2, jobId: 'REQ-10045', role: 'Product Marketing Manager', department: 'Marketing', 
    status: 'Draft', openedOn: '--',
    headcount: 1, locationMode: 'Remote', location: 'Anywhere', salaryBand: '₹12L - ₹16L',
    pipeline: { new: 0, processing: 0, final: 0 }
  },
  { 
    id: 3, jobId: 'REQ-10012', role: 'DevOps Engineer', department: 'Engineering', 
    status: 'Closed', openedOn: 'Jan 15, 2026',
    headcount: 1, locationMode: 'On-Site', location: 'San Francisco, CA', salaryBand: '₹22L - ₹30L',
    pipeline: { new: 112, processing: 30, final: 4 }
  },
  { 
    id: 4, jobId: 'REQ-10061', role: 'Talent Acquisition', department: 'Human Resources', 
    status: 'Active', openedOn: 'Apr 08, 2026',
    headcount: 3, locationMode: 'Hybrid', location: 'London, UK', salaryBand: '₹10L - ₹14L',
    pipeline: { new: 18, processing: 4, final: 0 }
  }
];

export default function RecruitmentDashboard() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();

  const filteredRecords = MOCK_RECORDS.filter(r => {
    const matchesSearch = r.role.toLowerCase().includes(search.toLowerCase()) || 
                          r.jobId.toLowerCase().includes(search.toLowerCase()) ||
                          r.department.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'All' ? true : r.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const activeCount = MOCK_RECORDS.filter(r => r.status === 'Active').length;
  const totalCandidates = MOCK_RECORDS.reduce((sum, r) => sum + r.pipeline.new + r.pipeline.processing + r.pipeline.final, 0);

  const renderPipelineBar = (pl) => {
    const total = (pl.new + pl.processing + pl.final) || 1; 
    const wN = (pl.new / total) * 100;
    const wP = (pl.processing / total) * 100;
    const wF = (pl.final / total) * 100;

    return (
      <div className={styles.pipelineWrap}>
        <div className={styles.pipelineMetrics}>
          <span>{total > 1 ? total : 0} DB</span>
          <span style={{color: 'var(--primary)'}}>{pl.processing + pl.final} ACTIVE</span>
        </div>
        <div className={styles.pipelineBarSegmented}>
          <div className={styles.segmentApplied} style={{ width: `${wN}%` }} title="New"/>
          <div className={styles.segmentScreening} style={{ width: `${wP}%` }} title="In-Process"/>
          <div className={styles.segmentOffer} style={{ width: `${wF}%` }} title="Final"/>
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
      {/* Structural Card: Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>Recruitment Command Center</h1>
          <p className={styles.headerDesc}>Strategic acquisition portal and automated hiring intelligence hub.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowWizard(true)}>
          New Recruitment
        </Button>
      </div>

      {/* Structural Card: Metrics Strip */}
      <div className={styles.metricsStrip}>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#eff6ff' }}>
            <Briefcase size={18} color="#2563eb" />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Capacity</span>
            <span className={styles.metricValue}>{MOCK_RECORDS.reduce((s,r) => s+r.headcount,0)}</span>
          </div>
        </div>
        <div className={styles.metricDivider}></div>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#ecfdf5' }}>
             <Users size={18} color="#10b981" />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Active Pipelines</span>
            <span className={styles.metricValue} style={{ color: '#059669' }}>{activeCount}</span>
          </div>
        </div>
        <div className={styles.metricDivider}></div>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#fffbeb' }}>
            <ExternalLink size={16} color="#d97706" />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Candidate Flow</span>
            <span className={styles.metricValue}>{totalCandidates}</span>
          </div>
        </div>
      </div>

      {/* Main Structural Container: Table Card */}
      <div className={styles.mainContainer}>
        {/* Advanced Toolbar Mirroring Employee Directory */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchContainer}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                placeholder="Search Req ID, Dept, or Role..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.mainSearch}
              />
            </div>
            
            <div className={styles.tabs}>
              {['All', 'Active', 'Draft', 'Closed'].map(tab => {
                const count = tab === 'All' ? MOCK_RECORDS.length : MOCK_RECORDS.filter(r => r.status === tab).length;
                return (
                  <button 
                    key={tab} 
                    className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab} <span className={styles.tabCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.toolbarRight}>
            <Button variant="outline" icon={<Filter size={15} />}>Deep Filter</Button>
          </div>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.saasTable}>
            <thead>
              <tr>
                <th style={{ width: '320px' }}>Target Role & Identity</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '120px' }}>Capacity</th>
                <th>Remuneration</th>
                <th>Deployment</th>
                <th style={{ width: '180px' }}>Pipeline Volume</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className={styles.roleMeta}>
                        <div className={styles.roleHeader}>
                           <span className={styles.roleName}>{r.role}</span>
                           <span className={styles.jobIdBadge}>{r.jobId}</span>
                        </div>
                        <span className={styles.roleDept}>
                          <Building2 size={12} /> {r.department}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={r.status === 'Active' ? 'success' : r.status === 'Draft' ? 'warning' : 'danger'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className={styles.capacityLabel}>{r.headcount} Slots</td>
                    <td className={styles.salaryLabel}>{r.salaryBand}</td>
                    <td>
                      <div className={styles.locationStack}>
                        <span className={styles.locMode}>{r.locationMode}</span>
                        <span className={styles.locCity}><MapPin size={10}/> {r.location}</span>
                      </div>
                    </td>
                    <td>{renderPipelineBar(r.pipeline)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/recruitment/pipeline/${r.jobId}`)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className={styles.emptyState}>
                      <AlertCircle size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                      <h3>No results match your criteria</h3>
                      <p>Adjust your search filters to find specific recruitment pipelines.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expansion Wizard */}
      <AnimatePresence>
        {showWizard && (
          <CreateRecruitmentWizard 
            onClose={() => setShowWizard(false)} 
            onCreate={(newId) => {
              setShowWizard(false);
              navigate(`/recruitment/pipeline/${newId}`);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
