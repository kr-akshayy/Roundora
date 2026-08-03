import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export default function StarRating({ rating, size = 14, interactive = false, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(rating);
        if (interactive) {
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange?.(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              <Star
                size={size}
                className={filled ? 'text-accent-amber fill-accent-amber' : 'text-slate-600'}
              />
            </button>
          );
        }
        return (
          <Star
            key={n}
            size={size}
            className={filled ? 'text-accent-amber fill-accent-amber' : 'text-slate-700'}
          />
        );
      })}
    </div>
  );
}
