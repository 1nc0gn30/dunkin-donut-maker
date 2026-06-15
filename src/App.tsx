import React, { useState, useEffect } from 'react';
import Sprinkleinator from './components/Sprinkleinator';
import CommunityShowcase from './components/CommunityShowcase';
import { Sparkles, Award } from 'lucide-react';
import { CommunityDonut } from './types';
import { fetchSubmissions } from './lib/netlify';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sprinkle' | 'showcase'>('sprinkle');
  const [communityDonuts, setCommunityDonuts] = useState<CommunityDonut[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch submissions from Netlify DB on mount
  useEffect(() => {
    async function loadSubmissions() {
      try {
        const submissions = await fetchSubmissions();
        if (submissions.length > 0) {
          setCommunityDonuts(submissions);
        } else {
          setCommunityDonuts([]);
        }
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubmissions();
  }, []);

  // Scroll to shared donut card when hash is present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#donut-')) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
      }
    }
  }, [communityDonuts]);

  const handleSubmitDonut = (newDonut: CommunityDonut) =>{
    setCommunityDonuts(prev => [newDonut, ...prev]);
    setActiveTab('showcase');
  };

  return (
    <div className={`min-h-screen bg-amber-50/20 text-gray-800 font-sans transition-all duration-300 pb-16`}>
      
      {/* Primary Dunkin' Style Navigation/Branding Panel */}
      <header className="bg-white border-b-8 border-[#FF671F] py-6 px-4 md:px-8 shadow-sm relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF671F] to-[#DA1A5F] flex items-center justify-center shadow-md border-4 border-white flex-shrink-0 animate-bounce">
              <span className="text-white font-display font-black text-2xl">DD</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-3xl md:text-4xl text-[#FF671F] uppercase tracking-tight leading-none">
                  DUNKIN<span className="text-[#DA1A5F]">'</span>
                </h1>
                <span className="bg-[#DA1A5F] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-widest leading-none mt-1">
                  Donut Creator
                </span>
              </div>
              <p className="text-xs font-mono text-gray-500 font-bold mt-1 uppercase tracking-wider">
                Create & Share The Next Great Donut!
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interactive Dashboard Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        
        {/* Parody intro card */}
        <div className="bg-white border-4 border-dashed border-[#DA1A5F] rounded-2xl p-5 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-5">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-[#DA1A5F] flex-shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-extrabold text-gray-900 text-sm md:text-base uppercase">
              Welcome to the Donut Creator Workshop!
            </h4>
            <p className="text-xs text-gray-650 mt-1 leading-relaxed">
              Design the custom donut of your dreams in our interactive 3D baking station. Once you're done, snap a selfie and submit it to the Community Showcase. The donuts with the most votes might just make it to our actual menu!
            </p>
          </div>
        </div>

        {/* Tab Selection Navigation Bar */}
        <div className="flex flex-wrap gap-2 mb-8" id="dashboard-navbar">
          <button
            onClick={() => setActiveTab('sprinkle')}
            className={`flex-1 min-w-[140px] py-3.5 px-4 rounded-xl font-display font-black uppercase text-xs md:text-sm tracking-tight border-b-4 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'sprinkle' 
                ? 'bg-[#FF671F] border-[#d85617] text-white shadow-md translate-y-[2px]' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-[#FF671F]/40'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            🍩 3D DONUT MAKER
          </button>

          <button
            onClick={() => setActiveTab('showcase')}
            className={`flex-1 min-w-[140px] py-3.5 px-4 rounded-xl font-display font-black uppercase text-xs md:text-sm tracking-tight border-b-4 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'showcase' 
                ? 'bg-[#5B2C6F] border-[#4A235A] text-white shadow-md translate-y-[2px]' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-purple-50/50 hover:border-[#5B2C6F]/40'
            }`}
          >
            <Award className="w-4 h-4" />
            ✨ COMMUNITY MENU
          </button>
        </div>

        {/* Dynamic Display based on Selected Active Tab */}
        <div className="relative">
          {activeTab === 'sprinkle' && <Sprinkleinator onSubmit={handleSubmitDonut} />}
          {activeTab === 'showcase' && <CommunityShowcase donuts={communityDonuts} onLike={(id, newLikes) => setCommunityDonuts(prev => prev.map(d => d.id === id ? {...d, likes: newLikes ?? d.likes + 1} : d))} />}
        </div>
      </main>

      {/* Enhanced Footer with Tech Stack */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-16 pb-8">
        {/* Powered By Section */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Powered By Amazing Tech</p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            
            {/* Netlify */}
            <a href="https://join.netlify.com/d8a2zdtel9gy-w6zrwt" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#00C7B7] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor">
                  <path d="M12 0L23.066 21H0L12 0Z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Netlify</span>
            </a>

            {/* Dunkin' */}
            <a href="https://www.dunkindonuts.com" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#FF671F] rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <span className="text-white font-black text-sm md:text-lg">DD</span>
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Dunkin'</span>
            </a>

            {/* Three.js */}
            <a href="https://threejs.org" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#000000] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <span className="text-white font-black text-[10px] md:text-xs">three.js</span>
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Three.js</span>
            </a>

            {/* Gemini */}
            <a href="https://ai.google.dev/gemini-api" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#4285F4] via-[#9B72CB] to-[#D96570] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <circle cx="12" cy="12" r="5"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Gemini AI</span>
            </a>

            {/* React */}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#61DAFB] rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor">
                  <circle cx="12" cy="12" r="3"/>
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(30 12 12)"/>
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(150 12 12)"/>
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(90 12 12)"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">React</span>
            </a>

            {/* Vite */}
            <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#646CFF] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor">
                  <path d="M12 2L2 19h20L12 2zm0 4.5L17.5 17H6.5L12 6.5z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Vite</span>
            </a>

          </div>
        </div>

        {/* Legal & Links */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="text-center md:text-left space-y-1">
            <p>© 2026 Dunkin' Engineering Alliance</p>
            <p className="text-[10px]">Built with ❤️ for the community</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://dunkin-donut-maker.netlify.app" className="hover:text-[#FF671F] transition-colors">Home</a>
            <span className="text-gray-300">•</span>
            <a href="https://dunkin-donut-maker.netlify.app" className="hover:text-[#FF671F] transition-colors">Community</a>
            <span className="text-gray-300">•</span>
            <a href="https://join.netlify.com/d8a2zdtel9gy-w6zrwt" className="hover:text-[#00C7B7] transition-colors">Deployed on Netlify</a>
          </div>
        </div>

        {/* Fun Tagline */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 font-mono">
            ☕ Sharing our sweet smiles, high-fives, and happy baking all day long! 🍩
          </p>
        </div>
      </footer>

    </div>
  );
}
