import React from 'react';
import { Award, Heart, Shield, Target } from 'lucide-react';

const CharacterSection: React.FC = () => {
  return (
    <section className="bg-zinc-900 py-20 relative overflow-hidden">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ 
          backgroundImage: 'url(https://images.pexels.com/photos/9754/mountains-clouds-forest-fog.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)',
          filter: 'grayscale(100%) contrast(1.2)' 
        }}
      ></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="text-red-500">#</span> CHARACTER PROGRESSION
            </h2>
            <div className="w-20 h-1 bg-red-600 mx-auto"></div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center mb-16">
            <div className="w-full md:w-1/2">
              <div className="relative overflow-hidden rounded-sm border border-zinc-700 shadow-2xl">
                <img 
                  src="https://images.pexels.com/photos/1300550/pexels-photo-1300550.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                  alt="Danny" 
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6">
                  <h3 className="text-2xl font-bold text-white tracking-tight">DANNY</h3>
                  <p className="text-gray-400 text-sm">Age: 19 | Status: Rising Enforcer</p>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">
                FROM NOBODY TO SOMEBODY
              </h3>
              <p className="text-gray-300 mb-6 text-sm md:text-base leading-relaxed">
                Danny grew up in the projects of Ironhaven with nothing but a desperate hunger to escape poverty. Smart, resourceful, but hardened by a life of violence, he's caught between his ambition and the last fragments of his conscience.
              </p>
              <p className="text-gray-300 mb-6 text-sm md:text-base leading-relaxed">
                As you guide Danny through Ironhaven's criminal underworld, you'll shape not just his skills, but his character. Every mission, every kill, and every betrayal pulls him deeper into darkness - or offers a chance at redemption.
              </p>
              
              <div className="bg-red-600/10 border border-red-800/30 p-4 rounded-sm">
                <p className="text-gray-200 text-sm italic">
                  "I started out thinking I could control this life, use it to get what I needed. Now I'm starting to think this life is using me. The question is: how far am I willing to go?"
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressionCard 
              icon={<Shield className="h-8 w-8 text-red-500" />}
              title="STREET REPUTATION"
              description="Your actions build fear or respect. Higher reputation unlocks new missions, territories, and allies - but also attracts more dangerous enemies."
              levels={[
                { name: "Unknown", description: "Just another face in the crowd" },
                { name: "Local Muscle", description: "Respected in your neighborhood" },
                { name: "Made Man", description: "Recognized lieutenant in the family" },
                { name: "Legendary", description: "Your name strikes fear citywide" }
              ]}
            />
            <ProgressionCard 
              icon={<Target className="h-8 w-8 text-red-500" />}
              title="COMBAT SKILLS"
              description="From street brawling to professional hits, Danny's combat abilities evolve with use. Master different weapons and techniques to survive."
              levels={[
                { name: "Street Fighter", description: "Basic melee combat" },
                { name: "Enforcer", description: "Skilled with basic firearms" },
                { name: "Hitman", description: "Expert with all weapons" },
                { name: "Untouchable", description: "Deadly at any range" }
              ]}
            />
            <ProgressionCard 
              icon={<Award className="h-8 w-8 text-red-500" />}
              title="CRIMINAL EMPIRE"
              description="From street corners to city blocks, expand your territory and criminal operations. Build a network of informants, dealers, and dirty cops."
              levels={[
                { name: "Corner Boy", description: "Small-time street operations" },
                { name: "Local Boss", description: "Control neighborhood rackets" },
                { name: "District Captain", description: "Run major territory operations" },
                { name: "Kingpin", description: "Citywide criminal empire" }
              ]}
            />
            <ProgressionCard 
              icon={<Heart className="h-8 w-8 text-red-500" />}
              title="MORAL COMPASS"
              description="Every choice shapes Danny's soul. Will you preserve his humanity or embrace the monster within? Your choices affect story outcomes and NPC reactions."
              levels={[
                { name: "Pragmatist", description: "Do what needs to be done" },
                { name: "Enforcer", description: "Loyal but with limits" },
                { name: "Cold-Blooded", description: "Ruthless and calculating" },
                { name: "Psychopath", description: "Feared even by allies" }
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

interface ProgressionLevel {
  name: string;
  description: string;
}

interface ProgressionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  levels: ProgressionLevel[];
}

const ProgressionCard: React.FC<ProgressionCardProps> = ({ icon, title, description, levels }) => {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 p-5 rounded-sm hover:bg-zinc-800/80 transition duration-300">
      <div className="mb-4">{icon}</div>
      <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      
      <div className="space-y-2">
        {levels.map((level, index) => (
          <div key={index} className="flex gap-2">
            <div className={`w-2 h-2 rounded-full mt-1.5 ${index === 0 ? 'bg-red-500' : 'bg-zinc-600'}`}></div>
            <div>
              <span className="text-white text-xs font-medium block">{level.name}</span>
              <span className="text-gray-500 text-xs">{level.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharacterSection;