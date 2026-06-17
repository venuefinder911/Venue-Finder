import bg from "../assets/bg.jpg";
import { ChevronDown } from "lucide-react";

const Hero = () => {
  const scrollToVenues = () => {
    const el = document.querySelector("#venues-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={bg} alt="venue background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-900/65 to-sky-900/55" />
      </div>
      {/* Decorative blobs */}
      <div className="hidden sm:block absolute top-20 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-sky-300 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full mb-4 sm:mb-6">
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse flex-shrink-0" />
          Pakistan&apos;s #1 Venue Booking Platform
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-4 sm:mb-6 tracking-tight">
          Find &amp; Book{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            Perfect Venues
          </span>
          <br className="hidden xs:block" />
          {" "}for Your Events
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
          Weddings, birthdays, engagements, corporate events — discover thousands of verified venues all in one place.
        </p>

        <button
          onClick={scrollToVenues}
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-sm sm:text-base transition-all duration-200 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5">
          Browse All Venues
        </button>

        {/* Scroll indicator */}
        <div className="mt-10 sm:mt-14 flex justify-center">
          <button onClick={scrollToVenues}
            className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors">
            <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
