import React from 'react';
import { Crosshair, Lightbulb, Skull, Brain, Map, Lock } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="bg-zinc-950 py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="text-red-500">#</span> KEY FEATURES
            </h2>
            <div className="w-20 h-1 bg-red-600 mx-auto mb-6"></div>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Ironhaven offers a raw, visceral experience that pushes the boundaries of emotional storytelling in gaming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <FeatureCard 
              icon={<Skull className="h-12 w-12 text-red-500" />}
              title="BRUTAL MOMENTS"
              description="Experience gut-wrenching scenes that don't shy away from the ugliness of criminal life. From disposing of bodies to witnessing executions, these moments will test your resolve."
            />
            <FeatureCard 
              icon={<Brain className="h-12 w-12 text-red-500" />}
              title="MORAL CHOICES"
              description="Face impossible decisions with no clear 'right' answer. Every choice has consequences, shaping Danny's character and the story's outcome. The line between victim and monster blurs with each decision."
            />
            <FeatureCard 
              icon={<Lightbulb className="h-12 w-12 text-red-500" />}
              title="RELATABLE STAKES"
              description="Danny's personal connections—his mother, younger brother, and childhood friends—ground the story in emotional reality. Your actions can endanger those he loves, raising the emotional stakes."
            />
            <FeatureCard 
              icon={<Crosshair className="h-12 w-12 text-red-500" />}
              title="DYNAMIC WORLD"
              description="NPCs remember your actions and react accordingly. Civilians flee at the sight of you, or rivals seek revenge for past wrongs. The city evolves based on your reputation and choices."
            />
            <FeatureCard 
              icon={<Map className="h-12 w-12 text-red-500" />}
              title="LIVING CITY"
              description="Ironhaven breathes with activity - random street crimes, gang wars, and emergent events that make every play session unique. Explore distinctive districts each with their own atmosphere and dangers."
            />
            <FeatureCard 
              icon={<Lock className="h-12 w-12 text-red-500" />}
              title="MULTIPLE ENDINGS"
              description="Your choices lead to dramatically different conclusions to Danny's story. Will he rule Ironhaven, escape his criminal past, or meet a violent end? The city's fate rests in your hands."
            />
          </div>

          <div className="bg-black/50 border border-zinc-800 rounded-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 relative">
                <img 
                  src="https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                  alt="Dramatic city skyline" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent md:bg-gradient-to-l"></div>
              </div>
              <div className="w-full md:w-2/3 p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-4">UNCOMPROMISING NARRATIVE</h3>
                <p className="text-gray-300 mb-6 text-sm md:text-base">
                  Ironhaven doesn't pull its punches. This is no sanitized crime fantasy—it's a brutal look at the psychological toll of violence and the cycle of poverty and crime. 
                  The story confronts players with the ugly reality behind the power fantasy, creating emotional resonance through unflinching portrayals of criminal life.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-sm transition duration-300 text-sm tracking-wide"
                  >
                    PLAY DEMO
                  </button>
                  <button className="bg-transparent border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-sm transition duration-300 text-sm tracking-wide">
                    READ DEVELOPER BLOG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-zinc-900/50 border-l-2 border-red-600 p-5 hover:bg-zinc-900/80 transition duration-300">
      <div className="mb-4 flex justify-center md:justify-start">
        {icon}
      </div>
      <h3 className="text-white font-medium text-lg mb-2 text-center md:text-left">
        {title}
      </h3>
      <p className="text-gray-400 text-sm text-center md:text-left">
        {description}
      </p>
    </div>
  );
};

export default FeaturesSection;