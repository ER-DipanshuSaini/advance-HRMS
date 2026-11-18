import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import styles from './EmailClient.module.css';

export default function FilterPanel({ filters, onChange, onClear, emailCount }) {
  return (
    <motion.div
      className={styles.filterPanel}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.filterGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Read Status</label>
          <select aria-label="Read Status" className={styles.filterSelect}
            value={filters.readStatus}
            onChange={e => onChange({ ...filters, readStatus: e.target.value })}
          >
            <option value="">All</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Starred</label>
          <select aria-label="Starred" className={styles.filterSelect}
            value={filters.starred}
            onChange={e => onChange({ ...filters, starred: e.target.value })}
          >
            <option value="">All</option>
            <option value="yes">Starred only</option>
            <option value="no">Not starred</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Has Attachment</label>
          <select aria-label="Has Attachment" className={styles.filterSelect}
            value={filters.hasAttachment}
            onChange={e => onChange({ ...filters, hasAttachment: e.target.value })}
          >
            <option value="">All</option>
            <option value="yes">With attachments</option>
            <option value="no">Without attachments</option>
          </select>
        </div>



        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sort By</label>
          <select aria-label="Sort By" className={styles.filterSelect}
            value={filters.sortBy}
            onChange={e => onChange({ ...filters, sortBy: e.target.value })}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="sender">Sender A–Z</option>
          </select>
        </div>
      </div>

      <div className={styles.filterFooter}>
        <span className={styles.filterResultCount}>
          {emailCount} message{emailCount !== 1 ? 's' : ''} match filters
        </span>
        <Button variant="outline" onClick={onClear}>
          <X size={13} /> Clear Filters
        </Button>
      </div>
    </motion.div>
  );
}
