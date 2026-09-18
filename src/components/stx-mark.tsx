import { assetUrl, cn } from "@/lib/utils";

const sizes = {
  nav: "h-9 sm:h-10",
  form: "h-11",
  hero: "h-14 sm:h-[4.5rem]",
} as const;

export function StxMark({
  className,
  stacked = false,
  size = "nav",
}: {
  className?: string;
  stacked?: boolean;
  size?: keyof typeof sizes;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={assetUrl("stx-logo.png")}
        alt="STX Corporation — Railroad Construction Services"
        className={cn("w-auto max-w-[min(100%,18rem)] object-contain object-left", sizes[size])}
      />
      {stacked ? (
        <span className="hidden border-l border-line pl-3 font-display text-[11px] font-semibold tracking-[0.18em] text-navy uppercase sm:inline">
          Visa Packet
        </span>
      ) : null}
    </div>
  );
}
