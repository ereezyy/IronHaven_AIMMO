import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, Mail, Instagram, Youtube, Twitter } from 'lucide-react';

const FooterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAgeVerified && email) {
      setIsSubmitted(true);
      // This would normally submit to a backend
      console.log('Submitted email:', email);
    }
  };

  return (
    <footer className="bg-black text-white pt-16 pb-8 border-t border-zinc-900">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center mb-12">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-10 w-10 text-red-500 mr-2" />
              <span className="text-white font-bold text-2xl tracking-widest">IRONHAVEN</span>
            </div>
            <p className="text-gray-400 text-sm text-center max-w-xl mb-8">
              Ironhaven is a brutal, immersive journey into the criminal underworld where your choices shape the narrative. 
              Prepare for a dark, uncompromising story that challenges your moral compass.
            </p>
            
            <div className="flex gap-4 mb-8">
              <SocialLink icon={<Twitter className="h-5 w-5" />} label="Twitter" />
              <SocialLink icon={<Instagram className="h-5 w-5" />} label="Instagram" />
              <SocialLink icon={<Youtube className="h-5 w-5" />} label="YouTube" />
              <SocialLink icon={<ExternalLink className="h-5 w-5" />} label="Official Website" />
            </div>
            
            <div className="w-full max-w-md bg-zinc-900/70 p-6 rounded-sm border border-zinc-800">
              {!isSubmitted ? (
                <>
                  <h3 className="text-lg font-semibold text-white mb-4 text-center">JOIN THE WAITLIST</h3>
                  <p className="text-gray-400 text-sm mb-6 text-center">
                    Be the first to receive updates, exclusive content, and beta access opportunities.
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <div className="flex">
                        <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center border border-zinc-700 border-r-0">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email address"
                          required
                          className="flex-1 bg-zinc-800 text-white border border-zinc-700 p-2 text-sm focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4 flex items-start">
                      <input
                        type="checkbox"
                        id="age-verification"
                        checked={isAgeVerified}
                        onChange={() => setIsAgeVerified(!isAgeVerified)}
                        className="mt-1 mr-2"
                        required
                      />
                      <label htmlFor="age-verification" className="text-gray-400 text-xs">
                        I confirm that I am at least 17 years old and I agree to receive emails about Ironhaven and related offers.
                      </label>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!isAgeVerified || !email}
                      className={`w-full py-3 text-sm font-medium tracking-wide ${
                        isAgeVerified && email
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                      } transition duration-300`}
                    >
                      SIGN UP
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <h3 className="text-lg font-semibold text-white mb-2">THANK YOU FOR JOINING</h3>
                  <p className="text-gray-400 text-sm">
                    We've added you to our waitlist. Watch your inbox for updates on Ironhaven.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-zinc-900 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0 flex items-center">
                <span className="text-red-500 font-bold mr-2">M</span>
                <span className="text-gray-400 text-xs">Mature 17+ | Violence | Strong Language | Drug Use</span>
              </div>
              
              <div className="text-gray-500 text-xs">
                &copy; {new Date().getFullYear()} Ironhaven. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

interface SocialLinkProps {
  icon: React.ReactNode;
  label: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ icon, label }) => {
  return (
    <a
      href="#"
      className="bg-zinc-900 hover:bg-red-600 h-10 w-10 rounded-full flex items-center justify-center transition-colors duration-300"
      aria-label={label}
    >
      {icon}
    </a>
  );
};

export default FooterSection;