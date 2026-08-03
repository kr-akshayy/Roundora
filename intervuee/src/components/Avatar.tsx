interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ url, name, size = 44, className = '' }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'Profile photo'}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border border-dark-border ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center font-semibold text-brand-300 shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
