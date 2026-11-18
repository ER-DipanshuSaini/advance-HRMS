import Button from './Button/Button';

export default function PageState({ title, children, action, tone = 'neutral' }) {
  return (
    <div className="page-state" role={tone === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action && <Button variant="outline" onClick={action.run}>{action.label}</Button>}
    </div>
  );
}
