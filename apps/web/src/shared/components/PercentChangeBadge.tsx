import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { formatSignedPercent } from "@/shared/utilities/numberFormatters.ts";

export function PercentChangeBadge({ percentChange }: { percentChange: number }) {
  return (
    <span
      className={mergeClassNames(
        "inline-flex items-center rounded-full px-2 py-0.75 text-label font-semibold",
        percentChange >= 0 ? "text-up bg-up-soft" : "text-down bg-down-soft",
      )}
    >
      {formatSignedPercent(percentChange)}
    </span>
  );
}
