import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  onPlayGame?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onPlayGame }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setOpacity(1);
  }, []);

  const scrollToContent = () => {
    const contentElement = document.getElementById('story');
    if (contentElement) {
      contentElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url(https://images.pexels.com/photos/2310713/pexels-photo-2310713.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)',
          filter: 'brightness(0.4) contrast(1.2)'
        }}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black"></div>

      {/* Content */}
      <div 
        className={`relative z-10 text-center px-4 max-w-5xl mx-auto transition-opacity duration-1000 ease-in-out`}
        style={{ opacity }}
      >
        <div className="mb-6 inline-block">
          <div className="bg-red-600 text-white text-xs md:text-sm px-3 py-1 mb-4 inline-block tracking-widest">
            RISE THROUGH THE UNDERWORLD
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
          <span className="block mb-2 text-red-500">IRONHAVEN</span>
          <span className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-300 block mt-2">
            THE STREETS SHOW NO MERCY
          </span>
        </h1>

        <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-sm md:text-base">
          Enter the brutal world of Ironhaven, where 19-year-old Danny fights to rise through the criminal hierarchy. 
          Make your choices, face the consequences, and discover if you have what it takes to survive in a city built on corruption and fear.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onPlayGame}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-sm transition duration-300 transform hover:scale-105 w-full sm:w-auto text-sm md:text-base font-medium tracking-wide"
          >
            PLAY DEMO
          </button>
          <button className="bg-transparent border border-gray-500 hover:border-white text-white px-8 py-3 rounded-sm transition duration-300 w-full sm:w-auto text-sm md:text-base font-medium tracking-wide">
            JOIN WAITLIST
          </button>
        </div>

        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer">
          <ChevronDown 
            onClick={scrollToContent}
            className="h-8 w-8 text-white opacity-70 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      {/* Age rating warning */}
      <div className="absolute bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-1 rounded flex items-center">
        <span className="text-red-500 font-bold mr-2">M</span>
        <span>Mature 17+ | Violence | Strong Language | Drug Use</span>
      </div>
    </section>
  );
};

export default HeroSection;