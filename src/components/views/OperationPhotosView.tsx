import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  deleteDoc, doc, where, orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { IncidentPhoto } from '../../types';
import { 
  Camera, Image as ImageIcon, Upload, 
  Trash2, Search, X, Plus, Maximize2 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { resizeImage } from '../../lib/imageUtils';

interface OperationPhotosViewProps {
  incidentId: string;
}

export default function OperationPhotosView({ incidentId }: OperationPhotosViewProps) {
  const [photos, setPhotos] = useState<IncidentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const path = 'incident_photos';

  useEffect(() => {
    const q = query(
      collection(db, path),
      where('incidentId', '==', incidentId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncidentPhoto)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });

    return () => unsubscribe();
  }, [incidentId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photos.length + files.length > 50) {
      alert("Limite de 50 fotos por incidente atingido.");
      return;
    }

    setUploading(true);
    try {
      for (const file of files as File[]) {
        // Max 1000KB (1MB) as requested
        const resizedBase64 = await resizeImage(file, 1000);
        
        await addDoc(collection(db, path), {
          url: resizedBase64,
          incidentId,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erro ao processar/enviar fotos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deletePhoto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir esta foto da operação?")) return;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, path);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between mb-8 bg-[#121212] p-6 rounded-2xl border border-white/5 relative overflow-hidden no-print">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-600"></div>
        <div className="flex items-center gap-4">
          <div className="bg-orange-600/20 p-2.5 rounded-xl text-orange-500">
             <Camera size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Fotos de Campo</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Registros Fotográficos da Operação ({photos.length}/50)</p>
          </div>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= 50}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:bg-slate-800 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(234,88,12,0.3)]"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Plus size={16} />
          )}
          Adicionar Fotos
        </button>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          capture="environment" // Hint for mobile to use camera
          className="hidden" 
          ref={fileInputRef}
          onChange={handleUpload}
        />
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-[#121212] border border-dashed border-white/5 rounded-3xl p-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
              <ImageIcon className="text-slate-700" size={40} />
            </div>
            <h3 className="text-white font-black italic uppercase tracking-tighter text-xl mb-2">Sem Registros Visuais</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-loose">
              Nenhuma foto foi capturada para este incidente até o momento.<br/>
              Clique no botão acima para iniciar o registro fotográfico.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <motion.div 
                layout
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-square bg-[#1A1A1A] rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-orange-600/30 transition-all shadow-xl"
                onClick={() => setSelectedPhoto(photo.url)}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                   <div className="flex items-center justify-between">
                     <span className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                       {new Date(photo.createdAt).toLocaleDateString()}
                     </span>
                     <button 
                       onClick={(e) => deletePhoto(photo.id!, e)}
                       className="p-2 bg-red-600/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-lg"
                     >
                       <Trash2 size={12} />
                     </button>
                   </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-orange-600/80 backdrop-blur-sm p-1.5 rounded-lg text-white">
                    <Maximize2 size={12} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/95 z-[100] p-4 flex items-center justify-center backdrop-blur-xl"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(234,88,12,0.15)] bg-black"
            >
              <img src={selectedPhoto} alt="Preview" className="w-full h-full object-contain" />
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md border border-white/10 transition-all"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
