type StarRatingProps = {
  value: number;
};

export const StarRating = ({ value }: StarRatingProps) => {
  const rounded = Math.round(value);

  return (
    <div className="flex items-center gap-0.5 text-sm text-amber-500" aria-label={`Note ${value} sur 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 ${index < rounded ? "fill-current" : "fill-transparent"} stroke-current`}
        >
          <path d="M10 1.5 12.9 7.4l6.5.9-4.7 4.6 1.1 6.5L10 16.6l-5.8 2.8 1.1-6.5L.6 8.3l6.5-.9L10 1.5Z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-slate-600">({value.toFixed(1)})</span>
    </div>
  );
};
