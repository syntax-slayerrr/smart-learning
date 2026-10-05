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
        className={`absolute inset-0 transition-opacity duration-700 ease-out ${opacityMap[intensity]} mix-blend-multiply contrast-[1.02] saturate-[1.05]`}
      >
        <Image
          src="/bg-atmosphere.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={90}
          className="object-cover object-center"
        />
      </div>

      {/* 3. Central Luminous Mask / Radial Diffuse Gradient
          Creates high-contrast, calm negative space in the center so text, cards, and data remain 100% sharp and readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.72)_0%,rgba(248,250,252,0.85)_50%,rgba(241,245,249,0.92)_100%)] backdrop-blur-[0.5px]" />

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
