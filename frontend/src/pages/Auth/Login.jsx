import { saveSession } from '../../session';
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
        saveSession(data);
        navigate('/', { replace: true });
      }
    } catch (err) {
      // API error handled by hook
    }
  };

  const heroPoints = [
    {
      icon: <Layout size={20} />,
      title: "Modular Infrastructure",
      desc: "Manage employee profiles, time off, and recruiting in one workspace."
    },
    {
      icon: <Users size={20} />,
      title: "Self-Service Identity",
      desc: "Give employees access to their profile and HR calendar."
    },
    {
      icon: <ShieldAlert size={20} />,
      title: "Granular RBAC",
      desc: "Control access to recruiting and HR records by role."
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
            {heroPoints.map(point => (
              <div key={point.title} className={styles.pointItem}>
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

          <form onSubmit={handleLogin} className={styles.form} aria-busy={loading}>
            {error && (
              <div className={styles.errorMessage} role="alert">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <Input 
              label="Work email" autoComplete="username"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              required
            />

            <Input 
              label="Password" autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              suffix={
                <button type="button" className={styles.passwordToggle} aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
            />

            <Button 
              type="submit" 
              loading={loading} 
              style={{ width: '100%', height: '52px', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
