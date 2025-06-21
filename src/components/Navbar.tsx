import React, { useState, useEffect } from 'react';
import { Menu, X, AlertTriangle } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/90 backdrop-blur-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-2" />
            <span className="text-white font-bold text-xl tracking-widest">IRONHAVEN</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <NavLink href="#story">STORY</NavLink>
            <NavLink href="#gameplay">GAMEPLAY</NavLink>
            <NavLink href="#city">CITY</NavLink>
            <NavLink href="#features">FEATURES</NavLink>
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm transition duration-300 transform hover:scale-105">
              COMING SOON
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-sm mt-4 py-4 px-2 rounded-md">
            <div className="flex flex-col space-y-4">
              <MobileNavLink href="#story" onClick={() => setIsMenuOpen(false)}>STORY</MobileNavLink>
              <MobileNavLink href="#gameplay" onClick={() => setIsMenuOpen(false)}>GAMEPLAY</MobileNavLink>
              <MobileNavLink href="#city" onClick={() => setIsMenuOpen(false)}>CITY</MobileNavLink>
              <MobileNavLink href="#features" onClick={() => setIsMenuOpen(false)}>FEATURES</MobileNavLink>
              <button 
                className="bg-red-600 hover:bg-red-700 text-white py-3 w-full rounded-sm transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                COMING SOON
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children }) => {
  return (
    <a 
      href={href} 
      className="text-gray-300 hover:text-white transition duration-300 text-sm font-medium tracking-wider"
    >
      {children}
    </a>
  );
};

const MobileNavLink: React.FC<NavLinkProps> = ({ href, children, onClick }) => {
  return (
    <a 
      href={href} 
      className="text-gray-300 hover:text-white transition duration-300 text-base font-medium tracking-wider block py-2 px-4 border-l-2 border-red-700"
      onClick={onClick}
    >
      {children}
    </a>
  );
};

export default Navbar;