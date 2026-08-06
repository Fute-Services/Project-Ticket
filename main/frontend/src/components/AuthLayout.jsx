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

      {/* 3D House Visual Right Side — Seamless */}
      <div className="hidden lg:flex w-[50%] h-full relative items-center justify-center overflow-hidden shrink-0 z-10">
        <div className="relative w-full h-full flex items-center justify-center p-2">
          <img
            src="/building.png"
            alt="Fute Services Luxury Architecture"
            className="w-[125%] max-w-none max-h-[94vh] object-contain transform scale-110 drop-shadow-[0_0_45px_rgba(245,158,11,0.4)] drop-shadow-[0_0_80px_rgba(232,96,36,0.3)] drop-shadow-[0_30px_70px_rgba(0,0,0,0.95)]"
          />
        </div>
      </div>
    </div>
  );
}
