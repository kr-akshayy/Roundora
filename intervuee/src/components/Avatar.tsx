interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ url, name, size = 44, className = '' }: AvatarProps) {
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : 'R';

  // Array of sleek gradient combinations based on initial char code
  const gradients = [
    'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #db2777 0%, #9333ea 100%)',
  ];

  const charCode = initial.charCodeAt(0) || 0;
  const gradient = gradients[charCode % gradients.length];

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'Profile photo'}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover ring-2 ring-indigo-500/20 shadow-sm transition-transform duration-150 hover:scale-105 ${className}`}
        onError={(e) => {
          // Fallback to default avatar image if user url fails to load
          (e.target as HTMLImageElement).src = '/default-avatar.png';
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.42)),
        background: gradient,
      }}
      className={`rounded-full flex items-center justify-center font-bold text-white shadow-md ring-2 ring-indigo-500/20 shrink-0 select-none transition-transform duration-150 hover:scale-105 ${className}`}
    >
      {initial}
    </div>
  );
}

