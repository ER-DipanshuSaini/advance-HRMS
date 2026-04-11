import { ShieldCheck, Users, Building2, UserCircle } from 'lucide-react';

export default function DashboardOverview() {
  const user = JSON.parse(localStorage.getItem('hireflow_user') || '{}');

  const stats = [
    { label: 'Active Employees', value: '2', icon: <Users size={24} />, color: '#0f62fe' },
    { label: 'Departments', value: '2', icon: <Building2 size={24} />, color: '#8a3ffc' },
    { label: 'System Roles', value: '2', icon: <ShieldCheck size={24} />, color: '#da1e28' },
    { label: 'Avg. Attendance', value: '100%', icon: <UserCircle size={24} />, color: '#198038' },
  ];

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Guest';

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>Good afternoon, {displayName}</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Welcome to the HireFlow IAM dashboard. Here is a quick look at your organization.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '0.75rem', background: `${stat.color}15`, color: stat.color, borderRadius: '12px' }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', minHeight: '300px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>System Health</h3>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.875rem' }}>
             Real-time health monitoring active. All services operational.
          </div>
        </div>
        <div className="card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Recent Logins</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#198038' }}></div>
               <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Dipanshu Saini</span>
               <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>Just now</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }}></div>
               <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Rajan Kumar</span>
               <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>2 mins ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
