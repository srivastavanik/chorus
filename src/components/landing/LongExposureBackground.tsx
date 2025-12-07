'use client';

export function LongExposureBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero-background.mp4" type="video/mp4" />
      </video>

      {/* Left Side Dark Overlay */}
      <div 
        className="absolute inset-y-0 left-0 w-3/4 z-10 pointer-events-none bg-gradient-to-r from-[#050505] via-[#050505]/95 to-transparent"
      />

      {/* Vignette/Fade to match theme */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80 z-10"></div>
    </div>
  );
}
