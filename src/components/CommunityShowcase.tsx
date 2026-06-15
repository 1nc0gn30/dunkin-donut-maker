import React from 'react';
import { toggleLike } from '../lib/netlify';
import { CommunityDonut } from '../types';
import { Heart, Star, Award, Twitter, Facebook, Instagram, Share2, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface ShowcaseProps {
  donuts: CommunityDonut[];
  onLike: (id: string) => void;
}

export default function CommunityShowcase({ donuts, onLike }: ShowcaseProps) {
  const handleLike = async (id: string) => {
    try {
      // Try Netlify API first (requires auth)
      const result = await toggleLike(id);
      onLike(id, result.likes);
    } catch (err) {
      // Fallback to local state update
      console.error('Like API failed, using local update:', err);
      onLike(id);
    }
  };
  return (
    <div className="bg-white rounded-2xl border-4 border-[#5B2C6F] overflow-hidden shadow-xl" id="community-showcase">
      <div className="bg-[#5B2C6F] px-6 py-4 flex justify-between items-center text-white">
        <div>
          <h2 className="font-display font-black text-2xl tracking-tight uppercase flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-300" /> Community Menu Spotlight
          </h2>
          <p className="text-white/90 text-xs font-sans mt-0.5 max-w-xl">
            Vote on your favorite community-submitted donut recipes to be featured on our official Dunkin' breakroom menu! Share them with your friends!
          </p>
        </div>
      </div>
      
      <div className="p-6 md:p-8 bg-purple-50 flex flex-wrap gap-6 justify-center min-h-[400px]">
        {donuts.map((d, i) => (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
             key={d.id} className="w-full max-w-[340px] bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
             
             <div className="p-4 border-b border-purple-100 flex items-center justify-between gap-3 bg-gradient-to-r from-purple-50 to-white">
               <div className="flex items-center gap-3">
                  {d.creatorImage ? (
                    <img src={d.creatorImage} alt={d.creatorName} className="w-10 h-10 rounded-full border-2 border-[#5B2C6F] object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#5B2C6F] text-white flex items-center justify-center font-bold text-sm">
                      {d.creatorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-zinc-800">Chef {d.creatorName}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{new Date(d.createdAt).toLocaleDateString()}</div>
                  </div>
               </div>

               <div className="flex items-center gap-2">
                 <button title="Share on Twitter" className="text-zinc-300 hover:text-[#1DA1F2] transition-colors cursor-pointer"><Twitter className="w-4 h-4" /></button>
                 <button title="Share on Facebook" className="text-zinc-300 hover:text-[#4267B2] transition-colors cursor-pointer"><Facebook className="w-4 h-4" /></button>
                 <button title="Share on Instagram" className="text-zinc-300 hover:text-[#C13584] transition-colors cursor-pointer"><Instagram className="w-4 h-4" /></button>
                 <button title="Copy Link" className="text-zinc-300 hover:text-[#FF671F] transition-colors cursor-pointer"><Share2 className="w-4 h-4" /></button>
               </div>
             </div>

             {d.videoUrl ? (
               <div className="w-full h-[240px] md:h-[320px] bg-[#fff4ea] border-b border-purple-100 relative overflow-hidden group flex items-center justify-center">
                  <video src={d.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded-md font-bold flex items-center gap-1 uppercase tracking-widest backdrop-blur-sm">
                    <Video className="w-3 h-3" /> Authentic 3D Render
                  </div>
               </div>
             ) : (
                <div className="w-full h-[180px] bg-gradient-to-tr from-[#FF671F]/20 to-[#DA1A5F]/20 flex items-center justify-center border-b border-purple-100 relative overflow-hidden">
                    <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl font-display font-black text-[#DA1A5F]">DD</div>
                </div>
             )}

             <div className="flex-1 p-5 space-y-3">
               <div className="font-display font-black text-lg uppercase text-[#DA1A5F] leading-tight">
                 {d.design.icingMessage || 'The Mystery Special'}
               </div>
               
               <ul className="text-xs font-mono text-zinc-600 space-y-1.5 border-l-2 border-[#FF671F] pl-3">
                 <li><strong className="text-zinc-800">Dough:</strong> {d.design.baseType.replace('_', ' ')}</li>
                 <li><strong className="text-zinc-800">Frosting:</strong> {d.design.glazeType}</li>
                 {d.design.drizzleType && d.design.drizzleType !== 'none' && (
                   <li><strong className="text-zinc-800">Drizzle:</strong> {d.design.drizzleType}</li>
                 )}
                 <li><strong className="text-zinc-800">Sprinkles:</strong> {d.design.sprinklesType}</li>
                 {d.design.customToppings.length > 0 && (
                   <li><strong className="text-zinc-800">Toppings:</strong> {d.design.customToppings.join(', ')}</li>
                 )}
               </ul>
             </div>

             <div className="bg-purple-100 p-3 flex justify-between items-center rounded-b-xl border-t border-purple-200">
               <button onClick={() => handleLike(d.id)} className="flex items-center gap-1.5 bg-white border border-purple-200 hover:border-[#DA1A5F] hover:text-[#DA1A5F] rounded-full px-4 py-1.5 text-xs font-bold text-zinc-700 transition-colors shadow-sm cursor-pointer">
                 <Heart className="w-3.5 h-3.5" /> Like
               </button>
               <span className="text-xs font-black text-[#5B2C6F] flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-purple-200">
                 <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {d.likes} Votes
               </span>
             </div>

           </motion.div>
        ))}
        {donuts.length === 0 && (
          <div className="text-center py-12 text-zinc-500 font-mono text-sm w-full">No community creations yet. Be the first to bake one!</div>
        )}
      </div>
    </div>
  );
}
