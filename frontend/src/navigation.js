import { BarChart3, Users, ShieldCheck, Building2, UserCircle, CalendarDays, Mail, Briefcase } from 'lucide-react';

export const navigation = [
  { href: '/', label: 'Dashboard', Icon: BarChart3 },
  { href: '/employees', label: 'Employees', Icon: Users, permission: 'users:view', description: 'Browse employee records and add employees.' },
  { href: '/org', label: 'Organization', Icon: Building2, permission: 'depts:view', description: 'Manage departments and designations.' },
  { href: '/recruitment', label: 'Recruitment', Icon: Briefcase, permission: 'recruitment:view', description: 'Review vacancies and candidate pipelines.' },
  { href: '/my-calendar', label: 'My calendar', Icon: CalendarDays, description: 'Check attendance, leave and holidays.' },
  { href: '/email', label: 'Mail', Icon: Mail, description: 'Open your connected mailboxes.' },
  { href: '/roles', label: 'Roles and permissions', Icon: ShieldCheck, permission: 'roles:view', description: 'Review roles and access permissions.' },
  { href: '/profile', label: 'My profile', Icon: UserCircle, permission: 'profile:view', description: 'View and update your employee profile.' },
];

export const navigationGroups = [
  { label: 'Overview', paths: ['/'] },
  { label: 'Organization', paths: ['/org', '/employees'] },
  { label: 'Recruitment', paths: ['/recruitment'] },
  { label: 'System', paths: ['/roles'] },
  { label: 'Personal', paths: ['/email', '/my-calendar', '/profile'] },
].map(({ label, paths }) => ({
  label,
  links: paths.map(path => navigation.find(item => item.href === path)),
}));