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
          // Fallback to mock data if no submissions yet
          setCommunityDonuts([
            {
              id: 'mock-1',
              creatorName: 'Alex B.',
              creatorEmail: 'alex@example.com',
              design: { baseType: 'blueberry', glazeType: 'orange', sprinklesType: 'rainbow', customToppings: ['raccoon', 'marshmallows'], icingMessage: 'GO TEAM!' },
              likes: 124,
              createdAt: new Date().toISOString(),
              status: 'approved'
            },
            {
              id: 'mock-2',
              creatorName: 'Sammy T.',
              creatorEmail: 'sammy@example.com',
              creatorPhone: '555-0123',
              design: { baseType: 'chocolate', glazeType: 'matcha', sprinklesType: 'gold', customToppings: ['coffee_beans', 'oreo'], icingMessage: 'MONDAY FIX' },
              likes: 89,
              createdAt: new Date().toISOString(),
              status: 'approved'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load submissions:', err);
        // Use mock data on error
        setCommunityDonuts([
          {
            id: 'mock-1',
            creatorName: 'Alex B.',
            design: { baseType: 'blueberry', glazeType: 'orange', sprinklesType: 'rainbow', customToppings: ['raccoon', 'marshmallows'], icingMessage: 'GO TEAM!' },
            likes: 124,
            createdAt: new Date().toISOString(),
            status: 'approved'
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadSubmissions();
  }, []);

  const handleSubmitDonut = (newDonut: CommunityDonut) => {
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

      {/* Funny Footnotes layout */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 text-center text-xs text-gray-400 space-y-1.5 font-mono">
        <p>© 2026 Dunkin' Donuts Parody Engineering Alliance (Not affiliated, built for human joy and friendly shift fun).</p>
        <p>Sharing our sweet smiles, high-fives, and happy baking all day long!</p>
      </footer>

    </div>
  );
}
