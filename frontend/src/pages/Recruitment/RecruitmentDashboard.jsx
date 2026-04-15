import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Search, Filter, Briefcase, 
  TrendingUp, Users, Clock, AlertCircle, MapPin, ExternalLink
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import CreateRecruitmentWizard from './CreateRecruitmentWizard';
import { useApi } from '../../hooks/useApi';
import { recruitmentService } from '../../api/recruitmentService';
import Card from '../../components/common/Card/Card';
import styles from './RecruitmentDashboard.module.css';

export default function RecruitmentDashboard() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showWizard, setShowWizard] = useState(false);
  const [records, setRecords] = useState([]);
  const { loading, request } = useApi();
  const navigate = useNavigate();

  const fetchRecruitments = async () => {
    try {
      const data = await request(null, { 
        call: () => recruitmentService.getPositions() 
      });
      
      // Transform backend data to frontend structure
      if (data && Array.isArray(data)) {
        const transformed = data.map(r => ({
          id: r.id,
          jobId: r.job_id,
          role: r.title,
          department: r.department_name,
          experience: r.experience_range,
          headcount: r.headcount,
          locationMode: r.location_mode.charAt(0).toUpperCase() + r.location_mode.slice(1).toLowerCase().replace('_', '-'),
          location: r.location,
          salaryBand: r.budget_range,
          statusStage: r.current_process_stage,
          internalStatus: r.status,
          openingDate: r.opening_date
        }));
        setRecords(transformed);
      }
    } catch (err) {
      console.error('Failed to fetch recruitments:', err);
    }
  };

  useEffect(() => {
    fetchRecruitments();
  }, []);

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.role.toLowerCase().includes(search.toLowerCase()) || 
                          r.jobId.toLowerCase().includes(search.toLowerCase()) ||
                          r.department.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const activeCount = records.filter(r => r.internalStatus === 'ACTIVE').length;
  const totalCandidates = records.length; // Placeholder for total candidates across all jobs

  const renderPipelineBar = (pl) => {
    const total = (pl.new + pl.processing + pl.final) || 0; 
    const wN = total ? (pl.new / total) * 100 : 0;
    const wP = total ? (pl.processing / total) * 100 : 0;
    const wF = total ? (pl.final / total) * 100 : 0;

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
      <div className={styles.pageHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>Recruitment Command Center</h1>
          <p className={styles.headerDesc}>Strategic acquisition portal and automated hiring intelligence hub.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowWizard(true)}>
          New Recruitment
        </Button>
      </div>

      <div className={styles.metricsStrip}>
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#eff6ff' }}>
            <Briefcase size={18} color="#2563eb" />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Capacity</span>
            <span className={styles.metricValue}>{records.reduce((s,r) => s+r.headcount,0)}</span>
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

      <Card noPadding shadow="sm" className={styles.mainContainer}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input 
                placeholder="Search by Job ID, Department, or Role..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.mainSearch}
              />
            </div>
          </div>
          <div className={styles.toolbarRight}>
            <Button variant="outline" icon={<Filter size={15} />}>Advanced Filters</Button>
          </div>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.saasTable}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th style={{ width: '120px' }}>Job ID</th>
                <th style={{ width: '250px' }}>Role Name</th>
                <th>Department</th>
                <th>Experience</th>
                <th style={{ width: '100px' }}>Openings</th>
                <th>Location</th>
                <th>Budget</th>
                <th style={{ width: '180px' }}>Process Stage</th>
                <th>Opening Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <div className={styles.emptyState}>
                      <div className={styles.spinner} />
                      <p>Loading recruitment pipelines...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((r, index) => (
                  <tr 
                    key={r.id} 
                    onClick={() => navigate(`/recruitment/pipeline/${r.jobId}`)}
                    className={styles.clickableRow}
                  >
                    <td className={styles.srNoCell}>{index + 1}</td>
                    <td className={styles.jobIdCell}><span className={styles.jobIdBadge}>{r.jobId}</span></td>
                    <td className={styles.roleNameCell}>{r.role}</td>
                    <td>{r.department}</td>
                    <td className={styles.expCell}>{r.experience}</td>
                    <td className={styles.headcountCell}>{r.headcount} Slots</td>
                    <td>
                      <div className={styles.locationStack}>
                        <span className={styles.locMode}>{r.locationMode}</span>
                        <span className={styles.locCity}><MapPin size={10}/> {r.location}</span>
                      </div>
                    </td>
                    <td className={styles.budgetCell}>{r.salaryBand}</td>
                    <td>
                      <Badge variant={
                        r.statusStage === 'Hired' ? 'success' : 
                        r.statusStage === 'Rejected' ? 'danger' : 
                        r.statusStage === 'Sourcing' ? 'warning' : 'primary'
                      }>
                        {r.statusStage}
                      </Badge>
                    </td>
                    <td>{r.openingDate}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10">
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
      </Card>

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
