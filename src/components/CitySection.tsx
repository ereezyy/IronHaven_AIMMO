import React, { useState } from 'react';
import { Building2, Container, Trees, Warehouse } from 'lucide-react';

const CitySection: React.FC = () => {
  const [activeDistrict, setActiveDistrict] = useState('downtown');

  const districts = [
    {
      id: 'downtown',
      name: 'DOWNTOWN',
      icon: <Building2 className="w-6 h-6 mb-2" />,
      image: 'https://images.pexels.com/photos/1108701/pexels-photo-1108701.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      description: 'The neon-lit heart of Ironhaven, where corporate skyscrapers tower over nightclubs, strip joints, and underground gambling dens. By day, businessmen and tourists navigate its streets. By night, gangs and hustlers claim their territory.',
      locations: ['The Crimson Tower', 'Paradise Club', 'Black Market', 'Chinatown']
    },
    {
      id: 'industrial',
      name: 'INDUSTRIAL ZONE',
      icon: <Warehouse className="w-6 h-6 mb-2" />,
      image: 'https://images.pexels.com/photos/2086621/pexels-photo-2086621.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      description: 'A wasteland of abandoned factories and decaying warehouses. Now home to drug labs, chop shops, and the most dangerous gangs in Ironhaven. The perfect place to dispose of bodies or conduct deals away from prying eyes.',
      locations: ['Rust Belt Arena', 'Abandoned Steel Mill', 'The Furnace', 'Container Yards']
    },
    {
      id: 'docks',
      name: 'HARBOR DISTRICT',
      icon: <Container className="w-6 h-6 mb-2" />,
      image: 'https://images.pexels.com/photos/2190282/pexels-photo-2190282.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      description: 'Ironhaven\'s lifeline to the outside world, where cargo ships bring in contraband and take out blood money. Controlled by corrupt union bosses and the Falcone family, the docks are the first stop for everything illegal entering the city.',
      locations: ['Smugglers\' Cove', 'Fisherman\'s Wharf', 'Container Terminal', 'Lighthouse']
    },
    {
      id: 'slums',
      name: 'THE PROJECTS',
      icon: <Trees className="w-6 h-6 mb-2" />,
      image: 'https://images.pexels.com/photos/1070945/pexels-photo-1070945.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      description: 'Ironhaven\'s forgotten children. Crumbling housing projects and poverty-stricken neighborhoods where Danny grew up. Police rarely venture here, leaving the residents to fend for themselves against gangs, addicts, and predatory loan sharks.',
      locations: ['Concrete Gardens', 'The Pit', 'Memorial Park', 'Danny\'s Childhood Home']
    }
  ];

  const selectedDistrict = districts.find(d => d.id === activeDistrict) || districts[0];

  return (
    <section id="city" className="bg-black py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="text-red-500">#</span> EXPLORE IRONHAVEN
            </h2>
            <div className="w-20 h-1 bg-red-600 mx-auto mb-6"></div>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A city of extremes, where wealth and poverty collide, where hope comes to die, and where Danny must navigate the dangerous streets to survive.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
            {districts.map((district) => (
              <button
                key={district.id}
                className={`p-4 flex flex-col items-center justify-center text-center transition duration-300 ${
                  activeDistrict === district.id
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-gray-300'
                }`}
                onClick={() => setActiveDistrict(district.id)}
              >
                {district.icon}
                <span className="text-xs font-medium tracking-wider">{district.name}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-1/2">
              <div className="relative h-80 md:h-96 overflow-hidden rounded-sm border border-zinc-800">
                <img
                  src={selectedDistrict.image}
                  alt={selectedDistrict.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-xl font-bold text-white mb-1">{selectedDistrict.name}</h3>
                  <div className="w-10 h-0.5 bg-red-600 mb-2"></div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <p className="text-gray-300 mb-6 text-sm md:text-base leading-relaxed">
                {selectedDistrict.description}
              </p>

              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-sm">
                <h4 className="text-white text-sm font-medium mb-3">KEY LOCATIONS</h4>
                <ul className="grid grid-cols-2 gap-2">
                  {selectedDistrict.locations.map((location, index) => (
                    <li key={index} className="flex items-center text-gray-400 text-sm">
                      <span className="text-red-500 mr-2">•</span>
                      {location}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CitySection;