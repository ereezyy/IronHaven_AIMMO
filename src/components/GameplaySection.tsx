import React, { useState } from 'react';
import { Sun as Gun, Car, ShieldAlert, UserCircle } from 'lucide-react';

const GameplaySection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('combat');

  const tabs = [
    { id: 'combat', icon: <Gun className="h-5 w-5 mr-2" />, label: 'COMBAT' },
    { id: 'driving', icon: <Car className="h-5 w-5 mr-2" />, label: 'DRIVING' },
    { id: 'wanted', icon: <ShieldAlert className="h-5 w-5 mr-2" />, label: 'WANTED SYSTEM' },
    { id: 'progression', icon: <UserCircle className="h-5 w-5 mr-2" />, label: 'PROGRESSION' },
  ];

  const getTabContent = (tabId: string) => {
    switch (tabId) {
      case 'combat':
        return {
          title: 'BRUTAL & VISCERAL COMBAT',
          description: 'Engage in realistic gunfights and brutal hand-to-hand combat. From improvised weapons to firearms, every confrontation feels raw and consequential.',
          features: [
            'Realistic weapon handling and damage',
            'Brutal melee combat with knives, bats, and improvised weapons',
            'Environmental kills and context-sensitive executions',
            'Dynamic NPC fear reactions based on your actions',
          ],
          image: 'https://images.pexels.com/photos/3737094/pexels-photo-3737094.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
        };
      case 'driving':
        return {
          title: 'REALISTIC VEHICLE SYSTEM',
          description: 'Experience Ironhaven from behind the wheel of over 30 stealable vehicles, each with unique handling and performance characteristics.',
          features: [
            'Realistic vehicle physics and damage modeling',
            'Wide variety of cars, motorcycles, and trucks to steal',
            'High-speed police chases with roadblocks and spike strips',
            'Vehicle customization and safe houses for storing your collection',
          ],
          image: 'https://images.pexels.com/photos/3422964/pexels-photo-3422964.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
        };
      case 'wanted':
        return {
          title: '5-STAR WANTED SYSTEM',
          description: 'Your crimes don\'t go unnoticed in Ironhaven. The more chaos you cause, the more heat you attract, from beat cops to SWAT teams.',
          features: [
            '5-star wanted level system with escalating police response',
            'Dynamic police AI that coordinates to trap and apprehend you',
            'Bribes, safe houses, and paint shops to lower your wanted level',
            'Reputation system affecting how gangs and civilians react to you',
          ],
          image: 'https://images.pexels.com/photos/1693095/pexels-photo-1693095.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
        };
      case 'progression':
        return {
          title: 'CHARACTER DEVELOPMENT',
          description: 'As Danny rises through the ranks, his skills and reputation evolve. Improve your abilities through practice and unlock new opportunities.',
          features: [
            'Skill progression in shooting, driving, stamina, and intimidation',
            'Reputation system affecting how different factions respond to you',
            'Unlock new weapons, vehicles, and safehouses as your influence grows',
            'Character customization with clothing and accessories that impact gameplay',
          ],
          image: 'https://images.pexels.com/photos/2531242/pexels-photo-2531242.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
        };
      default:
        return {
          title: '',
          description: '',
          features: [],
          image: ''
        };
    }
  };

  const content = getTabContent(activeTab);

  return (
    <section id="gameplay" className="bg-zinc-950 py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="text-red-500">#</span> GAMEPLAY
            </h2>
            <div className="w-20 h-1 bg-red-600 mx-auto"></div>
          </div>

          <div className="flex flex-wrap justify-center bg-zinc-900/60 border border-zinc-800 rounded-sm overflow-hidden mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="w-full lg:w-1/2">
              <div className="relative overflow-hidden rounded-sm border border-zinc-800 group">
                <img
                  src={content.image}
                  alt={content.title}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ height: '320px' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">
                {content.title}
              </h3>
              <p className="text-gray-300 mb-6 text-sm md:text-base leading-relaxed">
                {content.description}
              </p>

              <ul className="space-y-3">
                {content.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 font-bold mr-2">•</span>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameplaySection;