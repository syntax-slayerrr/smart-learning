import Image from "next/image";

interface AmbientBackgroundProps {
  /** Optional custom opacity (default 0.75) */
  intensity?: "subtle" | "medium" | "vivid";
  /** Optional className for wrapper adjustments */
  className?: string;
}

export function AmbientBackground({
  intensity = "medium",
  className = "",
}: AmbientBackgroundProps) {
  const opacityMap = {
    subtle: "opacity-60",
    medium: "opacity-80",
    vivid: "opacity-95",
  };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none transform-gpu ${className}`}
    >
      {/* 1. Underlying Canvas Tint */}
      <div className="absolute inset-0 bg-[#F8FAFC]" />

      {/* 2. Educational Atmospheric Base Image */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-out ${opacityMap[intensity]} contrast-[1.02] saturate-[1.05]`}
      >
        <Image
          src="/assets/backgrounds/poto1.png"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={100}
          className="object-cover object-bottom"
        />
      </div>

      {/* 3. Central Luminous Mask / Radial Diffuse Gradient
          Creates high-contrast, calm negative space in the center for cards while preserving the books & desk at the bottom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.45)_50%,rgba(255,255,255,0.05)_85%,transparent_100%)] pointer-events-none" />

      {/* 4. Spatial Depth Ambient Blooms
          Soft optical blooms matching the lavender, indigo, and periwinkle ribbons of the artwork */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-300/20 blur-[100px]" />
      <div className="absolute top-1/4 -right-28 h-96 w-96 rounded-full bg-blue-300/15 blur-[120px]" />
      <div className="absolute -bottom-28 -left-28 h-96 w-96 rounded-full bg-violet-300/20 blur-[110px]" />
      <div className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-indigo-200/15 blur-[90px]" />

      {/* 5. Integrated Perimeter Vignette & Apple Smooth Shadow
          Softly diffuses outer edges to prevent harsh boundaries */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(15,23,42,0.035)]" />
    </div>
  );
}
