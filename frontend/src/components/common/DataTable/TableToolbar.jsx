import { useId, useState } from 'react';
import { ChevronDown, Filter, Search } from 'lucide-react';
import Button from '../Button/Button';
import Select from '../Select/Select';
import styles from './TableToolbar.module.css';

export default function TableToolbar({ search, onSearch, searchLabel, placeholder, filters, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const filterId = useId();

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <input type="search" aria-label={searchLabel} placeholder={placeholder} value={search}
            onChange={event => onSearch(event.target.value)} />
        </label>
        {filters.length > 0 && <Button variant="outline" icon={<Filter size={15} />}
          aria-controls={filterId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
          Advanced Filters <ChevronDown size={14} aria-hidden="true" />
        </Button>}
      </div>
      <div id={filterId} className={styles.filterBar} hidden={!expanded}>
        {filters.map(filter => (
          <Select key={filter.label} label={filter.label} value={filter.value}
            onChange={event => filter.onChange(event.target.value)}>
            {filter.options.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </Select>
        ))}
        {(search || filters.some(filter => filter.value)) &&
          <Button variant="ghost" onClick={onReset}>Reset Filters</Button>}
      </div>
    </>
  );
}
