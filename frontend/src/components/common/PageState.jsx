import Loader from './Loader/Loader';
import Button from './Button/Button';

export default function PageState({ title, children, action, tone = 'neutral' }) {
  return (
    <div className="page-state" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'loading' && <Loader size="lg" />}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action && <Button variant="outline" onClick={action.run}>{action.label}</Button>}
    </div>
  );
}
