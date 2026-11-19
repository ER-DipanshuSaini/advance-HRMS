import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useOutletContext } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Auth/Login';
import DashboardOverview from './pages/Dashboard/DashboardOverview';
import RoleManagement from './pages/Roles/RoleManagement';
import OrgStructure from './pages/Organization/OrgStructure';
import EmployeeDirectory from './pages/Employees/EmployeeDirectory';
import Profile from './pages/Profile/Profile';
import MyCalendar from './pages/MyCalendar/MyCalendar';
import RecruitmentDashboard from './pages/Recruitment/RecruitmentDashboard';
import RecruitmentDetails from './pages/Recruitment/RecruitmentDetails';
import PageState from './components/common/PageState';
import { getToken, hasPermission, readUser } from './session';
import { navigation } from './navigation';

const EmailClient = lazy(() => import('./pages/Email/EmailClient'));
const routes = {
  '/roles': RoleManagement, '/org': OrgStructure, '/employees': EmployeeDirectory,
  '/profile': Profile, '/my-calendar': MyCalendar, '/email': EmailClient, '/recruitment': RecruitmentDashboard,
};

function PrivateLayout() {
  return getToken() && readUser() ? <DashboardLayout /> : <Navigate to="/login" replace />;
}

function ProtectedPage({ access, children }) {
  const user = useOutletContext();
  return hasPermission(user, access) ? children :
    <PageState title="You do not have access to this page"><Link to="/">Back to dashboard</Link></PageState>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateLayout />}>
          <Route index element={<DashboardOverview />} />
          {navigation.filter(item => routes[item.href]).map(({ href, permission }) => {
            const Page = routes[href];
            return <Route key={href} path={href.slice(1)} element={
              <ProtectedPage access={permission}>
                <Suspense fallback={<PageState tone="loading" title="Loading page..." />}><Page /></Suspense>
              </ProtectedPage>
            } />;
          })}
          <Route path="recruitment/pipeline/:id" element={
            <ProtectedPage access="recruitment:view"><RecruitmentDetails /></ProtectedPage>
          } />
          <Route path="*" element={<PageState title="Page not found"><Link to="/">Back to dashboard</Link></PageState>} />
        </Route>
      </Routes>
    </Router>
  );
}
