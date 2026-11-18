import Select from '../../components/common/Select/Select';
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
        <Select label="Read Status" value={filters.readStatus} onChange={e => onChange({ ...filters, readStatus: e.target.value })}><option value="">All</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </Select>

        <Select label="Starred" value={filters.starred} onChange={e => onChange({ ...filters, starred: e.target.value })}><option value="">All</option>
            <option value="yes">Starred only</option>
            <option value="no">Not starred</option>
          </Select>

        <Select label="Has Attachment" value={filters.hasAttachment} onChange={e => onChange({ ...filters, hasAttachment: e.target.value })}><option value="">All</option>
            <option value="yes">With attachments</option>
            <option value="no">Without attachments</option>
          </Select>



        <Select label="Sort By" value={filters.sortBy} onChange={e => onChange({ ...filters, sortBy: e.target.value })}><option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="sender">Sender A–Z</option>
          </Select>
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
