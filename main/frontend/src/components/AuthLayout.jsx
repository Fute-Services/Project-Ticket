export default function AuthLayout({ children }) {
  return (
    <div className="h-screen w-screen max-h-screen bg-[#0b0b0d] text-white flex flex-col lg:flex-row overflow-hidden font-sans relative">
      {/* Full screen seamless radial glow behind building */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,_rgba(245,158,11,0.18)_0%,_rgba(232,96,36,0.08)_35%,_transparent_75%)] pointer-events-none" />
      <div className="hidden lg:block absolute right-[10%] top-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />

      {/* Form Left Side */}
      <div className="w-full lg:w-[50%] h-full flex flex-col justify-center p-6 sm:px-12 sm:py-8 relative z-10 overflow-hidden">
        {/* Form Body Container */}
        <div className="w-full max-w-[400px] mx-auto py-2">
          {children}
        </div>
      </div>

      {/* 3D House Visual Right Side — Seamless with Super Glowing Window Lights */}
      <div className="hidden lg:flex w-[50%] h-full relative items-center justify-center overflow-hidden shrink-0 z-10">
        {/* Pulsating Building Light Orbs */}
        <div className="absolute right-[20%] top-[25%] w-[180px] h-[180px] bg-amber-400/45 rounded-full blur-[45px] pointer-events-none animate-pulse z-0" />
        <div className="absolute right-[30%] top-[42%] w-[160px] h-[160px] bg-orange-500/40 rounded-full blur-[50px] pointer-events-none animate-pulse z-0" />
        <div className="absolute right-[15%] bottom-[22%] w-[200px] h-[200px] bg-yellow-400/35 rounded-full blur-[55px] pointer-events-none animate-pulse z-0" />
        <div className="absolute right-[35%] bottom-[35%] w-[140px] h-[140px] bg-amber-300/40 rounded-full blur-[40px] pointer-events-none z-0" />

        <div className="relative w-full h-full flex items-center justify-center p-2 z-10">
          <img
            src="/building.png"
            alt="Fute Services Glowing Luxury Architecture"
            className="w-[125%] max-w-none max-h-[94vh] object-contain transform scale-110 drop-shadow-[0_0_55px_rgba(245,158,11,0.85)] drop-shadow-[0_0_100px_rgba(232,96,36,0.65)] drop-shadow-[0_0_150px_rgba(255,215,0,0.45)] drop-shadow-[0_30px_70px_rgba(0,0,0,0.95)] brightness-110 contrast-105"
          />
        </div>
      </div>
    </div>
  );
}
