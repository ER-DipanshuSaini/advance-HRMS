import Loader from '../Loader/Loader';
import { AlertCircle, Inbox, SearchX } from 'lucide-react';
import Button from '../Button/Button';
import Card from '../Card/Card';
import styles from './DataTable.module.css';

const stateIcons = { empty: Inbox, filtered: SearchX, error: AlertCircle };

function TableState({ columns, tone = 'empty', title, description, action, icon }) {
  const Icon = icon || stateIcons[tone];
  return (
    <tr><td colSpan={columns} className={styles.stateCell}>
      <div className={styles.state} data-tone={tone}>
        <div className={styles.stateCopy} role={tone === 'error' ? 'alert' : 'status'}>
          <span className={styles.stateIcon} aria-hidden="true">{tone === 'loading' ? <Loader /> : <Icon size={25} />}</span>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {action && <Button size="sm" variant={tone === 'empty' ? 'primary' : 'outline'}
          icon={action.icon} onClick={action.run}>{action.label}</Button>}
      </div>
    </td></tr>
  );
}

function Pagination({ page, total, onPrevious, onNext, hasPrevious, hasNext }) {
  return (
    <nav className={styles.pagination} aria-label="Table pagination">
      <span>Page {page} · {total} {total === 1 ? 'result' : 'results'}</span>
      <div className={styles.paginationActions}>
        <Button variant="outline" onClick={onPrevious} disabled={!hasPrevious}>Previous</Button>
        <Button variant="outline" onClick={onNext} disabled={!hasNext}>Next</Button>
      </div>
    </nav>
  );
}

export default function DataTable({
  label, columns, rows, rowKey, toolbar, pagination, loading, error, onRetry, empty, onRowClick,
}) {
  const state = error ? {
    tone: 'error', title: 'Could not load ' + label.toLowerCase(), description: error,
    action: onRetry && { label: 'Retry', run: onRetry },
  } : loading ? { tone: 'loading', title: 'Loading ' + label.toLowerCase() + '...' } :
    !rows.length ? { title: 'No results', ...empty } : null;

  return (
    <Card variant="table" noPadding footer={pagination?.total > 0 && <Pagination {...pagination} />}>
      {toolbar}
      <div className={styles.scrollRegion} tabIndex={0} role="region" aria-label={label}>
        <table className={styles.table} aria-label={label} aria-busy={loading || undefined}>
          <colgroup>{columns.map(column => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
          <thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
          <tbody>
            {state ? <TableState columns={columns.length} {...state} /> :
              rows.map((row, index) => (
                <tr key={rowKey(row)} className={onRowClick ? styles.interactive : undefined}
                  onClick={onRowClick ? event => {
                    if (!event.target.closest('a, button, input, select, textarea, label')) onRowClick(row);
                  } : undefined}>
                  {columns.map(column => <td key={column.key}>{column.render(row, index)}</td>)}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
