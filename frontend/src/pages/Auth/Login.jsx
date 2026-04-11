import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Mail, Lock, Eye, EyeOff, 
  AlertCircle, Layout, Users, ShieldAlert 
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { loading, error, request } = useApi();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await request('/iam/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (data) {
        localStorage.setItem('hireflow_auth', 'true');
        localStorage.setItem('hireflow_token', data.access_token);
        localStorage.setItem('hireflow_user', JSON.stringify(data.user));
        navigate('/');
      }
    } catch (err) {
      // API error handled by hook
    }
  };

  const handleDemoLogin = (type) => {
    const creds = type === 'admin' 
      ? { e: 'admin@hireflow.com', p: 'password' } 
      : { e: 'employee@hireflow.com', p: 'password' };
    setEmail(creds.e);
    setPassword(creds.p);
  };

  const heroPoints = [
    {
      icon: <Layout size={20} />,
      title: "Modular Infrastructure",
      desc: "One-click deployment of HR, Payroll, and Performance modules."
    },
    {
      icon: <Users size={20} />,
      title: "Self-Service Identity",
      desc: "Empower employees with zero-trust profile and seat management."
    },
    {
      icon: <ShieldAlert size={20} />,
      title: "Granular RBAC",
      desc: "Bank-grade permission boundaries for every seat in the organization."
    }
  ];

  return (
    <div className={styles.loginPage}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>HireFlow Enterprise</span>
          <h1>Empower your workforce with modern IAM.</h1>
          
          <div className={styles.heroPoints}>
            {heroPoints.map((point, i) => (
              <div key={i} className={styles.pointItem}>
                <div className={styles.pointIcon}>{point.icon}</div>
                <div className={styles.pointText}>
                  <h4>{point.title}</h4>
                  <p>{point.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className={styles.formSection}>
        <div className={styles.loginCard}>
          <div className={styles.formHeader}>
            <div className={styles.logoBox}>
              <ShieldCheck size={24} color="white" />
            </div>
            <h2>Sign in</h2>
            <p>Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleLogin} className={styles.form}>
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <Input 
              label="Company Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              required
            />

            <Input 
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              suffix={
                <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', display: 'flex' }}>
                   {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
              }
              required
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
                 <input type="checkbox" style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} /> Remember me
              </label>
              <button type="button" style={{ 
                background: 'none', border: 'none', padding: 0, 
                fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', 
                cursor: 'pointer' 
              }}>Forgot password?</button>
            </div>

            <Button 
              type="submit" 
              loading={loading} 
              style={{ width: '100%', height: '52px', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              Access Dashboard
            </Button>
          </form>

          <div className={styles.demoSection}>
            <p>Demo Portals</p>
            <div className={styles.demoButtons}>
              <Button onClick={() => handleDemoLogin('admin')} variant="outline" style={{ flex: 1, height: '44px' }}>SuperAdmin</Button>
              <Button onClick={() => handleDemoLogin('employee')} variant="outline" style={{ flex: 1, height: '44px' }}>Employee</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}