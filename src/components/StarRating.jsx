import { Star } from "lucide-react";

/**
 * @param {number}  rating   — 0-5 (supports decimals for display)
 * @param {(n:number)=>void} onRate — callback when user clicks a star
 * @param {boolean} readonly — if true, just display
 * @param {"sm"|"md"|"lg"} size
 */
const StarRating = ({ rating = 0, onRate, readonly = false, size = "md" }) => {
  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" };
  const iconSize = sizeMap[size] || sizeMap.md;

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((s) => {
        const filled = rating >= s;
        const half = !filled && rating >= s - 0.5;

        return (
          <button
            key={s}
            type="button"
            disabled={readonly}
            onClick={() => onRate && onRate(s)}
            className={`relative ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
          >
            {/* Background star (empty) */}
            <Star
              className={`${iconSize} text-gray-200`}
            />
            {/* Filled overlay */}
            {(filled || half) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? "100%" : "50%" }}
              >
                <Star
                  className={`${iconSize} text-amber-400 fill-amber-400`}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
