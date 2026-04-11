import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Auth
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Auth/Login';

// Core Views
import DashboardOverview from './pages/Dashboard/DashboardOverview';
import RoleManagement from './pages/Roles/RoleManagement';
import OrgStructure from './pages/Organization/OrgStructure';
import EmployeeDirectory from './pages/Employees/EmployeeDirectory';
import Profile from './pages/Profile/Profile';
import MyCalendar from './pages/MyCalendar/MyCalendar';
import EmailClient from './pages/Email/EmailClient';
import RecruitmentDashboard from './pages/Recruitment/RecruitmentDashboard';
import RecruitmentDetails from './pages/Recruitment/RecruitmentDetails';

function PrivateRoute() {
  const isAuth = localStorage.getItem('hireflow_auth') === 'true';
  return isAuth ? <DashboardLayout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route path="/" element={<PrivateRoute />}>
          <Route index element={<DashboardOverview />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="org" element={<OrgStructure />} />
          <Route path="employees" element={<EmployeeDirectory />} />
          <Route path="profile" element={<Profile />} />
          <Route path="my-calendar" element={<MyCalendar />} />
          <Route path="email" element={<EmailClient />} />
          <Route path="recruitment" element={<RecruitmentDashboard />} />
          <Route path="recruitment/pipeline/:id" element={<RecruitmentDetails />} />
          
          {/* Fallback route */}
          <Route path="*" element={<div style={{ padding: '2rem' }}>Page Not Found or Module Removed.</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

// EOF
