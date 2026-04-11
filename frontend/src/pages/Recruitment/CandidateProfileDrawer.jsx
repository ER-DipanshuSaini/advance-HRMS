import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, Mail, Phone, MapPin, FileBadge, Download, 
  CheckCircle, XCircle, Briefcase, ExternalLink, ArrowRight
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import styles from './CandidateProfileDrawer.module.css';

export default function CandidateProfileDrawer({ candidate, onClose, pipelineStages, onMoveStage }) {
  if (!candidate) return null;

  const currentIndex = pipelineStages.indexOf(candidate.status);
  const nextStage = currentIndex >= 0 && currentIndex < pipelineStages.length - 1 ? pipelineStages[currentIndex + 1] : null;

  return (
    <div className={styles.overlay}>
      <motion.div 
        className={styles.drawer}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      >
        <div className={styles.header}>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}>
              {candidate.name.charAt(0)}
            </div>
            <div className={styles.nameBlock}>
              <h2>{candidate.name}</h2>
              <div className={styles.titleLine}>
                <Briefcase size={14} /> {candidate.title}
              </div>
              <div className={styles.badgeStack}>
                <span className={styles.matchBadge}>{candidate.match}% Overall Match</span>
                <span className={styles.timeBadge}>Applied 2 days ago</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.sidebar}>
            <div className={styles.infoGroup}>
              <div className={styles.label}>Contact Information</div>
              <div className={styles.value}><Mail size={16} /> {candidate.email || 'candidate@email.com'}</div>
              <div className={styles.value}><Phone size={16} /> {candidate.phone || '+1 (555) 123-4567'}</div>
              <div className={styles.value}><MapPin size={16} /> {candidate.location || 'New York, USA'}</div>
              <div className={styles.linkValue}><ExternalLink size={16}/> LinkedIn Profile</div>
            </div>
            
            <div className={styles.infoGroup}>
              <div className={styles.label}>AI Extracted Skills</div>
              <div className={styles.skillsStack}>
                {['React', 'TypeScript', 'Node.js', 'Figma', 'GraphQL'].map(s => (
                  <span key={s} className={styles.skillTag}>{s}</span>
                ))}
              </div>
            </div>

            <div className={styles.infoGroup}>
              <div className={styles.label}>Pipeline Override</div>
              <select 
                className={styles.stageSelect}
                value={candidate.status} 
                onChange={(e) => onMoveStage(candidate.id, e.target.value)}
              >
                <option value="New">Unprocessed (New)</option>
                {pipelineStages.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className={styles.mainView}>
            <div className={styles.pdfSectionHeader}>
              <div className={styles.pdfTitle}>
                <div className={styles.pdfIconBox}>
                  <FileBadge size={18} />
                </div>
                <h3>Original Resume</h3>
              </div>
              <Button variant="outline" size="sm" icon={<Download size={14} />}>Download PDF</Button>
            </div>
            
            <div className={styles.pdfViewport}>
              <FileBadge size={64} strokeWidth={1} style={{ marginBottom: '1.5rem', opacity: 0.4 }} />
              <p>Secure PDF Viewport Space</p>
              <span className="text-sm text-muted" style={{ marginTop: '0.5rem', maxWidth: '300px', textAlign: 'center', lineHeight: 1.5 }}>
                When backend routes are connected, the resume binary will mount securely within this frame via `react-pdf`.
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <Button variant="danger" icon={<XCircle size={16}/>} onClick={() => { onMoveStage(candidate.id, 'Rejected'); onClose(); }}>
            Reject Candidate
          </Button>
          
          <div className="flex items-center gap-4">
            <span className={styles.currentStatusText}>
              Current: <span className={styles.currentStatusValue}>{candidate.status}</span>
            </span>
            {nextStage ? (
              <Button variant="primary" icon={<ArrowRight size={16}/>} onClick={() => { onMoveStage(candidate.id, nextStage); onClose(); }}>
                Advance to {nextStage}
              </Button>
            ) : (
              <Button variant="primary" icon={<CheckCircle size={16}/>} onClick={onClose}>
                Finish Pipeline
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
