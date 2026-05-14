import { MedicLogo } from "./medic-logo";

export function SplashScreen({ tagline = "Caring from afar. Your health, our priority." }: { tagline?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[image:var(--gradient-hero)] px-6 text-center text-white">
      <div className="animate-pulse">
        <MedicLogo variant="white" className="scale-150" />
      </div>
      <p className="mt-8 max-w-xs font-display text-xl font-semibold leading-snug">{tagline}</p>
      <div className="mt-10 h-1 w-24 overflow-hidden rounded-full bg-white/30">
        <div className="h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-white" />
      </div>
      <style>{`@keyframes loading { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }`}</style>
    </div>
  );
}
