import React, { useState, useEffect } from 'react';

interface SimpleIntroProps {
  onComplete: () => void;
}

const SimpleIntro: React.FC<SimpleIntroProps> = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(20);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 5000);

    return () => clearInterval(stageTimer);
  }, []);

  const getStageContent = () => {
    switch (stage) {
      case 0:
        return {
          title: "IRONHAVEN AIMMO",
          subtitle: "AI-Powered Cyberpunk MMORPG",
          description: "Experience the future of gaming with advanced AI"
        };
      case 1:
        return {
          title: "REAL-TIME MULTIPLAYER",
          subtitle: "Connect with players worldwide",
          description: "Guilds • PvP • Territory Wars • Live Combat"
        };
      case 2:
        return {
          title: "ADVANCED AI SYSTEMS",
          subtitle: "Powered by Hugging Face",
          description: "Smart NPCs • Dynamic Stories • Procedural Missions"
        };
      case 3:
        return {
          title: "READY TO PLAY",
          subtitle: "Built for Bolt Hackathon 2025",
          description: "Click anywhere to start the experience"
        };
      default:
        return { title: "", subtitle: "", description: "" };
    }
  };

  const content = getStageContent();

  const handleClick = () => {
    if (timeLeft <= 5) {
      onComplete();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black via-purple-900 to-black cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Cyberpunk grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite'
          }}
        />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400 rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-8">
        {/* Main title */}
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-6 animate-pulse">
          {content.title}
        </h1>
        
        {/* Subtitle */}
        <h2 className="text-2xl md:text-4xl text-cyan-300 mb-4 animate-fade-in">
          {content.subtitle}
        </h2>
        
        {/* Description */}
        <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl animate-fade-in-delay">
          {content.description}
        </p>

        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-6 text-lg text-cyan-400 mb-12">
          <div className="animate-bounce">🤖 AI NPCs</div>
          <div className="animate-bounce delay-100">🌐 Multiplayer</div>
          <div className="animate-bounce delay-200">⚔️ Real-time Combat</div>
          <div className="animate-bounce delay-300">🏰 Guild Wars</div>
        </div>

        {/* Progress bar */}
        <div className="w-80 max-w-full">
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 transition-all duration-1000 ease-out"
              style={{ width: `${((20 - timeLeft) / 20) * 100}%` }}
            />
          </div>
          
          <p className="text-gray-400 text-lg">
            {timeLeft > 0 ? `Starting in ${timeLeft}s` : "Click to enter game"}
          </p>
        </div>

        {/* Call to action */}
        {timeLeft <= 5 && (
          <button
            onClick={onComplete}
            className="mt-8 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-12 py-4 rounded-lg font-bold text-xl transition-all transform hover:scale-105 animate-pulse"
          >
            ENTER IRONHAVEN AIMMO
          </button>
        )}
      </div>

      {/* Cyberpunk borders */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent animate-pulse" />
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-pulse" />
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-purple-600 to-transparent animate-pulse" />
        
        {/* Corner decorations */}
        <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-purple-600" />
        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-purple-600" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-cyan-400" />
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 1s ease-out 0.5s both;
        }
      `}</style>
    </div>
  );
};

export default SimpleIntro;

