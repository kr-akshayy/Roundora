export interface Topic {
  id: string;
  label: string;
  color: string; // tailwind text color class
  category?: string;
}

export const TOPICS: Topic[] = [
  // Core CS
  { id: 'dsa', label: 'DSA & Coding', color: 'text-brand-400', category: 'Core CS' },
  { id: 'system_design', label: 'System Design', color: 'text-accent-purple', category: 'Core CS' },
  // Language-specific
  { id: 'java', label: 'Java Interview', color: 'text-orange-600', category: 'Language' },
  { id: 'python', label: 'Python Interview', color: 'text-yellow-600', category: 'Language' },
  { id: 'react', label: 'React Interview', color: 'text-accent-cyan', category: 'Language' },
  { id: 'mern', label: 'MERN Stack', color: 'text-emerald-600', category: 'Language' },
  // Role-based
  { id: 'frontend', label: 'Frontend', color: 'text-accent-cyan', category: 'Role' },
  { id: 'backend', label: 'Backend', color: 'text-accent-emerald', category: 'Role' },
  { id: 'sde1', label: 'SDE-1 Mock', color: 'text-brand-500', category: 'Role' },
  { id: 'sde2', label: 'SDE-2 Mock', color: 'text-brand-700', category: 'Role' },
  { id: 'qa_sdet', label: 'QA / SDET', color: 'text-teal-600', category: 'Role' },
  // Domain
  { id: 'ml_ds', label: 'Data Science / ML', color: 'text-accent-rose', category: 'Domain' },
  { id: 'resume', label: 'Resume-Based Interview', color: 'text-slate-600', category: 'Domain' },
  // Soft skills
  { id: 'behavioral', label: 'Behavioral / HR', color: 'text-accent-amber', category: 'Soft Skills' },
  // Management
  { id: 'product', label: 'Product Management', color: 'text-brand-300', category: 'Management' },
];

export function topicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function topicColor(id: string): string {
  return TOPICS.find((t) => t.id === id)?.color ?? 'text-slate-400';
}
