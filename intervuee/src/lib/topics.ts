export interface Topic {
  id: string;
  label: string;
  color: string; // tailwind text color class
}

export const TOPICS: Topic[] = [
  { id: 'dsa', label: 'DSA & Coding', color: 'text-brand-400' },
  { id: 'system_design', label: 'System Design', color: 'text-accent-purple' },
  { id: 'frontend', label: 'Frontend', color: 'text-accent-cyan' },
  { id: 'backend', label: 'Backend', color: 'text-accent-emerald' },
  { id: 'behavioral', label: 'Behavioral / HR', color: 'text-accent-amber' },
  { id: 'ml_ds', label: 'Data Science / ML', color: 'text-accent-rose' },
  { id: 'product', label: 'Product Management', color: 'text-brand-300' },
];

export function topicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function topicColor(id: string): string {
  return TOPICS.find((t) => t.id === id)?.color ?? 'text-slate-400';
}
