import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, TileLayer, GeoJSON, 
  LayersControl, useMap, Marker, Popup 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  collection, query, onSnapshot, addDoc, 
  serverTimestamp, where, deleteDoc, doc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { MapLayer } from '../../types';
import { 
  Map as MapIcon, Plus, Upload, 
  Trash2, Layers, FileCode, X, Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as toGeoJSON from 'togeojson';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  incidentId: string;
}

function ZoomToLayers({ layers }: { layers: MapLayer[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (layers.length > 0) {
      const group = new L.FeatureGroup();
      layers.forEach(layer => {
        if (layer.data) {
          try {
            const geoLayer = L.geoJSON(layer.data);
            group.addLayer(geoLayer);
          } catch (e) {
            console.error("Error creating geo layer for zoom", e);
          }
        }
      });
      
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }
  }, [layers, map]);

  return null;
}

export default function MapView({ incidentId }: MapViewProps) {
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'text'>('file');
  const [kmlText, setKmlText] = useState('');
  const [layerName, setLayerName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'map_layers'),
      where('incidentId', '==', incidentId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const layersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MapLayer[];
      setLayers(layersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, 'map_layers');
    });

    return () => unsubscribe();
  }, [incidentId]);

  const handleKmlParse = (kmlString: string) => {
    try {
      const parser = new DOMParser();
      const kml = parser.parseFromString(kmlString, 'text/xml');
      const geoJson = toGeoJSON.kml(kml);
      return geoJson;
    } catch (error) {
      console.error("KML Parse Error:", error);
      alert("Erro ao processar KML. Verifique o formato.");
      return null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!layerName) {
      setLayerName(file.name.replace('.kml', ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setKmlText(content);
    };
    reader.readAsText(file);
  };

  const saveLayer = async () => {
    if (!layerName || !kmlText) {
      alert("Preencha o nome e o conteúdo do KML.");
      return;
    }

    const geoJson = handleKmlParse(kmlText);
    if (!geoJson) return;

    try {
      await addDoc(collection(db, 'map_layers'), {
        name: layerName,
        data: geoJson,
        type: 'kml',
        incidentId,
        createdAt: Date.now()
      });
      setShowAddModal(false);
      setKmlText('');
      setLayerName('');
    } catch (error) {
      handleFirestoreError(error, 'create' as any, 'map_layers');
    }
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Remover esta camada do mapa?")) return;
    try {
      await deleteDoc(doc(db, 'map_layers', id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, 'map_layers');
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <header className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl border border-slate-200 no-print shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600/10 p-2 rounded-lg">
            <Layers className="text-orange-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">SIG Operacional</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sistema de Informações Geográficas</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus size={14} />
          Importar KML
        </button>
      </header>

      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-white relative shadow-lg">
        <MapContainer 
          center={[-19.9173, -43.9345]} // Default to BH or adjust to incident coordinates
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satélite (Google)">
              <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Híbrido (Google)">
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
            </LayersControl.BaseLayer>

            {layers.map((layer) => (
              <LayersControl.Overlay checked key={layer.id} name={layer.name}>
                <GeoJSON 
                  data={layer.data} 
                  style={() => ({
                    color: '#EA380C',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                    fillColor: '#EA380C'
                  })}
                  onEachFeature={(feature, leafletLayer) => {
                    if (feature.properties && feature.properties.name) {
                      leafletLayer.bindPopup(`<strong>${feature.properties.name}</strong><br/>${feature.properties.description || ''}`);
                    }
                  }}
                />
              </LayersControl.Overlay>
            ))}
          </LayersControl>

          <ZoomToLayers layers={layers} />
        </MapContainer>

        {/* Floating Layer Control */}
        <div className="absolute left-4 top-4 z-10 w-48 no-print">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Camadas Ativas</span>
              <span className="bg-orange-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black">{layers.length}</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              {layers.length === 0 ? (
                <p className="p-3 text-[9px] text-slate-400 italic uppercase">Sem camadas</p>
              ) : (
                layers.map(layer => (
                  <div key={layer.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded group transition-colors">
                    <span className="text-[10px] font-bold text-slate-600 truncate w-32 uppercase italic">{layer.name}</span>
                    <button 
                      onClick={() => deleteLayer(layer.id!)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-slate-900 font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <Upload size={18} className="text-orange-600" />
                  Nova Camada KML
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors uppercase text-[10px] font-black tracking-widest">Fechar</button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">NOME DA CAMADA</label>
                  <input 
                    type="text" 
                    placeholder="EX: PERÍMETRO DO FOGO, PONTOS DE CAPTAÇÃO..."
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 outline-none text-slate-900 font-bold uppercase transition-all focus:border-orange-600"
                    value={layerName}
                    onChange={(e) => setLayerName(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setUploadType('file')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm font-black",
                      uploadType === 'file' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <Upload size={14} />
                    Arquivo .KML
                  </button>
                  <button 
                    onClick={() => setUploadType('text')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm font-black",
                      uploadType === 'text' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <FileCode size={14} />
                    Código KML
                  </button>
                </div>

                {uploadType === 'file' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-600/30 hover:bg-orange-600/5 transition-all group"
                  >
                    <Upload className="mx-auto text-slate-300 mb-3 group-hover:text-orange-600 transition-colors" size={32} />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      {kmlText ? "Arquivo carregado" : "Clique para selecionar arquivo .KML"}
                    </p>
                    <input 
                      type="file" 
                      accept=".kml" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">CÓDIGO XML DO KML</label>
                    <textarea 
                      className="w-full bg-slate-50 border-slate-200 border rounded-lg text-[10px] p-3 outline-none text-slate-500 font-mono transition-all focus:border-orange-600 min-h-[150px]"
                      placeholder="CONTEÚDO DO ARQUIVO KML..."
                      value={kmlText}
                      onChange={(e) => setKmlText(e.target.value)}
                    />
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    onClick={saveLayer}
                    disabled={!layerName || !kmlText}
                    className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:bg-slate-100 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-slate-200"
                  >
                    Ativar Camada no Mapa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
