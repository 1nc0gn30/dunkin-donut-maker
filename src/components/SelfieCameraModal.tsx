import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SelfieCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

const FILTERS = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'dunkin', label: 'Sweet Vibes', css: 'sepia(0.3) saturate(1.4) contrast(1.1) brightness(1.05)' },
  { id: 'vintage', label: 'Retro Baker', css: 'sepia(0.7) contrast(1.2)' },
  { id: 'pop', label: 'Candy Pop', css: 'saturate(2) hue-rotate(15deg) contrast(1.1)' },
  { id: 'bw', label: 'Classic B&W', css: 'grayscale(1) contrast(1.2)' },
  { id: 'warm', label: 'Warm Glow', css: 'sepia(0.4) saturate(1.8) hue-rotate(-10deg)' }
];

export default function SelfieCameraModal({ isOpen, onClose, onCapture }: SelfieCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [rawPhoto, setRawPhoto] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRawPhoto(null);
      setError(null);
      setActiveFilter(FILTERS[0]);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error(err);
      setError('Camera access denied or unavailable. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror horizontally for user-facing camera natural feel
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
      }
      setRawPhoto(canvas.toDataURL('image/jpeg', 0.9));
      stopCamera();
    }
  };

  const retake = () => {
    setRawPhoto(null);
    startCamera();
  };

  const handleSave = () => {
    if (!rawPhoto) return;
    
    // Apply filter via an off-screen canvas process before returning
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = activeFilter.css;
        ctx.drawImage(img, 0, 0);
        onCapture(canvas.toDataURL('image/jpeg', 0.9));
      }
    };
    img.src = rawPhoto;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/90 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-[#5B2C6F]">
            <div className="flex justify-between items-center p-4 bg-[#5B2C6F] text-white">
              <h3 className="font-display font-black uppercase flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-yellow-300"/> Snap a Selfie
              </h3>
              <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 bg-purple-50">
              {error ? (
                <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl flex flex-col items-center text-center gap-3">
                  <AlertCircle className="w-10 h-10 mb-1" />
                  <p className="font-bold text-sm uppercase">{error}</p>
                  <p className="text-xs">Please allow camera permissions in your browser and try again.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Camera / Photo Area */}
                  <div className="relative w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden shadow-inner border-4 border-white mx-auto max-w-[320px]">
                    {!rawPhoto ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]"
                        style={{ filter: activeFilter.css }}
                      />
                    ) : (
                      <img src={rawPhoto} alt="Captured selfie" className="w-full h-full object-cover" style={{ filter: activeFilter.css }} />
                    )}
                  </div>

                  {!rawPhoto ? (
                    <div className="flex flex-col items-center gap-3 pt-2">
                      <div className="text-[10px] uppercase font-bold text-purple-800 tracking-widest">Strike a pose!</div>
                      <button onClick={takePhoto} className="w-16 h-16 bg-[#DA1A5F] border-4 border-white shadow-[0_0_0_2px_#DA1A5F] rounded-full hover:scale-105 transition-transform flex items-center justify-center cursor-pointer">
                         <Camera className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2">
                      {/* Filters Strip */}
                      <div className="flex gap-2.5 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar -mx-2">
                        {FILTERS.map(f => (
                          <button 
                            key={f.id} 
                            onClick={() => setActiveFilter(f)} 
                            className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                              activeFilter.id === f.id 
                                ? 'bg-white border-[#5B2C6F] shadow-md scale-105' 
                                : 'bg-transparent border-transparent hover:bg-white/50'
                            }`}
                          >
                             <div className={`w-12 h-12 rounded-full overflow-hidden shadow-sm`}>
                                <img src={rawPhoto} alt={f.label} className="w-full h-full object-cover" style={{ filter: f.css }} />
                             </div>
                             <span className={`text-[10px] font-black uppercase tracking-tight ${activeFilter.id === f.id ? 'text-[#5B2C6F]' : 'text-zinc-600'}`}>
                               {f.label}
                             </span>
                          </button>
                        ))}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-3">
                        <button onClick={retake} className="flex-1 bg-white hover:bg-purple-100 text-[#5B2C6F] border-2 border-[#5B2C6F] py-3 rounded-xl font-black uppercase tracking-tight text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer">
                          <RefreshCw className="w-4 h-4" /> Retake
                        </button>
                        <button onClick={handleSave} className="flex-1 bg-[#FF671F] hover:bg-[#e85a1a] text-white py-3 rounded-xl font-black uppercase tracking-tight text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer">
                          <Check className="w-4 h-4" /> Use Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
