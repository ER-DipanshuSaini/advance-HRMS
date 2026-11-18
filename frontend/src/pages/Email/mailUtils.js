export const API_BASE = '/communication';

const AVATAR_COLORS = [
  '#e0e7ff', '#fce7f3', '#fef3c7', '#d1fae5',
  '#dbeafe', '#ede9fe', '#cffafe', '#fee2e2'
];

export const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const stripHtml = (html) => {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent || "";
};
