import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { resizeImage } from '../lib/imageUtils';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoUpload({ photos, onChange, maxPhotos = 3 }: PhotoUploadProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    try {
      const remainingSlots = maxPhotos - photos.length;
      const filesToProcess = files.slice(0, remainingSlots) as File[];

      const newPhotosPromises = filesToProcess.map(file => resizeImage(file, 400)); // targeting 400kb to be safe
      const newPhotos = await Promise.all(newPhotosPromises);
      
      onChange([...photos, ...newPhotos]);
    } catch (error) {
      console.error("Error processing images:", error);
      alert("Erro ao processar imagens.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Fotos (Máx {maxPhotos})</label>
        <span className="text-[10px] font-bold text-slate-600">{photos.length}/{maxPhotos}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
            <img src={photo} alt="" className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="aspect-square rounded-xl border-2 border-dashed border-white/5 bg-white/5 flex flex-col items-center justify-center gap-1 hover:border-orange-600/30 hover:bg-orange-600/5 transition-all text-slate-500 hover:text-orange-500"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Camera size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
}
