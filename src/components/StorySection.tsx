import React from 'react';
import { Users, Skull, Banknote, Target } from 'lucide-react';

const StorySection: React.FC = () => {
  return (
    <section id="story" className="bg-zinc-900 py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="text-red-500">#</span> THE STORY
            </h2>
            <div className="w-20 h-1 bg-red-600 mx-auto"></div>
          </div>

          <div className="mb-16">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/2 order-2 md:order-1">
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">
                  A DESPERATE CLIMB TO POWER
                </h3>
                <p className="text-gray-300 mb-6 text-sm md:text-base leading-relaxed">
                  Danny, a 19-year-old from Ironhaven's crumbling slums, has nothing but his wits and determination. Born into poverty 
                  and raised in violence, he's forced to navigate a world where loyalty is temporary and betrayal is inevitable.
                </p>
                <p className="text-gray-300 mb-6 text-sm md:text-base leading-relaxed">
                  Working for the feared Falcone crime family, Danny's hands quickly become stained with blood. Each job pulls him deeper 
                  into a web of corruption that spans from street corners to the highest offices in Ironhaven.
                </p>
                <p className="text-gray-400 text-sm italic">
                  "In Ironhaven, you either become the predator or remain the prey. There is no middle ground."
                </p>
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2">
                <div className="relative">
                  <img 
                    src="https://images.pexels.com/photos/2333293/pexels-photo-2333293.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                    alt="Dark urban alleyway" 
                    className="w-full h-auto rounded-sm object-cover"
                    style={{ height: '400px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StoryBeat 
              icon={<Users className="h-10 w-10 text-red-500" />}
              title="FALCONE FAMILY"
              description="Danny's first employers and mentors in crime. Their protection comes at a steep price - absolute loyalty."
            />
            <StoryBeat 
              icon={<Skull className="h-10 w-10 text-red-500" />}
              title="FIRST BLOOD"
              description="Danny's initiation leaves him forever changed, as he commits his first murder to prove his worth."
            />
            <StoryBeat 
              icon={<Banknote className="h-10 w-10 text-red-500" />}
              title="RISING POWER"
              description="As Danny's influence grows, so do the targets on his back. Friends become enemies overnight."
            />
            <StoryBeat 
              icon={<Target className="h-10 w-10 text-red-500" />}
              title="FINAL CHOICE"
              description="Danny must decide: rule through fear or escape the life that's consuming his humanity."
            />
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 p-6 rounded-sm">
            <h3 className="text-lg font-semibold text-white mb-3">PLAYER CHOICE & CONSEQUENCES</h3>
            <p className="text-gray-300 text-sm md:text-base">
              Every decision in Ironhaven carries weight. Show mercy to a rival? They might return the favor—or exploit your weakness. 
              Execute a traitor? You'll send a message, but create new enemies. Your choices shape Danny's journey and determine 
              which of multiple endings you'll experience.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

interface StoryBeatProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const StoryBeat: React.FC<StoryBeatProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-zinc-800/30 p-5 border-l-2 border-red-600 hover:bg-zinc-800/60 transition duration-300">
      <div className="mb-4">{icon}</div>
      <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
};

export default StorySection;