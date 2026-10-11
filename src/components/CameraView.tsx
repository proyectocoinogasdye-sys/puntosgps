import React, { useRef, useState, useEffect } from 'react';
import { Waypoint, StampStyle, ProjectSettings, StampedPhoto } from '../types';
import { stampDataOnImage } from '../utils/cameraOverlay';
import { Camera, SwitchCamera, Download, Check, X, RefreshCw, Upload, Sparkles, Sliders } from 'lucide-react';

interface CameraViewProps {
  waypoint: Partial<Waypoint>;
  settings: ProjectSettings;
  compassHeading: number | null;
  onPhotoCaptured: (stampedPhoto: StampedPhoto) => void;
  onClose: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  waypoint,
  settings,
  compassHeading,
  onPhotoCaptured,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StampStyle>(settings.stampStyle || 'banner_solocator');
  const [showStyleMenu, setShowStyleMenu] = useState<boolean>(false);

  // Iniciar cámara
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      try {
        setCameraError(null);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = newStream;
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        console.warn('Error accediendo a cámara web:', err);
        setCameraError('No se pudo acceder a la cámara directa. Puedes subir una foto desde la galería de tu dispositivo.');
      }
    }

    if (!previewPhoto) {
      initCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, previewPhoto]);

  // Alternar cámara delantera / trasera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capturar foto desde el video feed
  const handleCapture = async () => {
    if (!videoRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;

      const stampedDataUrl = await stampDataOnImage(video, {
        waypoint,
        settings,
        compassHeading,
        style: selectedStyle,
      });

      setPreviewPhoto(stampedDataUrl);
    } catch (err) {
      console.error('Error al estampar coordenadas en foto:', err);
      alert('Error procesando la imagen con las coordenadas.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Subir foto desde archivo / galería
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const stampedDataUrl = await stampDataOnImage(img, {
            waypoint,
            settings,
            compassHeading,
            style: selectedStyle,
          });
          setPreviewPhoto(stampedDataUrl);
        } catch (err) {
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Re-estampar con otro estilo si el usuario cambia el estilo en la vista previa
  const handleStyleChange = async (newStyle: StampStyle) => {
    setSelectedStyle(newStyle);
    if (previewPhoto) {
      // Re-estampar sobre la foto actual
      const img = new Image();
      img.onload = async () => {
        setIsProcessing(true);
        const restamped = await stampDataOnImage(img, {
          waypoint,
          settings,
          compassHeading,
          style: newStyle,
        });
        setPreviewPhoto(restamped);
        setIsProcessing(false);
      };
      img.src = previewPhoto;
    }
  };

  // Aceptar y guardar foto en el punto
  const handleConfirmPhoto = () => {
    if (!previewPhoto) return;

    const stampedPhoto: StampedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dataUrl: previewPhoto,
      timestamp: new Date().toISOString(),
      stampStyle: selectedStyle,
      caption: `${waypoint.pointCode} - ${waypoint.category}`,
    };

    onPhotoCaptured(stampedPhoto);
  };

  // Descargar foto directamente a la memoria del dispositivo
  const handleDownloadDirect = () => {
    if (!previewPhoto) return;
    const a = document.createElement('a');
    a.href = previewPhoto;
    const filename = `${waypoint.pointCode || 'PUNTO'}_estampado_${new Date().toISOString().slice(0, 10)}.jpg`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-2 md:p-4 select-none">
      {/* Barra superior de control */}
      <div className="w-full max-w-4xl flex items-center justify-between text-white py-2 z-10 px-2">
        <div className="flex items-center gap-2">
          <span className="bg-amber-600 text-stone-950 font-bold px-2 py-0.5 rounded font-mono text-xs">
            {waypoint.pointCode || 'PTO-GPS'}
          </span>
          <span className="text-stone-300 text-xs hidden sm:inline">
            Cámara de Campo con Estampado Topográfico
          </span>
        </div>

        {/* Selector de Estilo de Estampa */}
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="flex items-center gap-1.5 bg-stone-800/90 border border-stone-700 hover:bg-stone-700 text-amber-300 px-2.5 py-1.5 rounded text-xs transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Estilo:</span>
            <span className="font-semibold capitalize">
              {selectedStyle === 'banner_solocator'
                ? 'Solocator Pro'
                : selectedStyle === 'hud_theodolite'
                ? 'Teodolito HUD'
                : selectedStyle === 'card_compact'
                ? 'Tarjeta'
                : 'Split'}
            </span>
          </button>

          {showStyleMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl p-1 z-30 text-xs text-stone-200">
              <button
                onClick={() => { handleStyleChange('banner_solocator'); setShowStyleMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded ${selectedStyle === 'banner_solocator' ? 'bg-amber-600 text-stone-950 font-bold' : 'hover:bg-stone-800'}`}
              >
                Banner Solocator (Recomendado)
              </button>
              <button
                onClick={() => { handleStyleChange('hud_theodolite'); setShowStyleMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded ${selectedStyle === 'hud_theodolite' ? 'bg-amber-600 text-stone-950 font-bold' : 'hover:bg-stone-800'}`}
              >
                Teodolito HUD (Militar / Topo)
              </button>
              <button
                onClick={() => { handleStyleChange('card_compact'); setShowStyleMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded ${selectedStyle === 'card_compact' ? 'bg-amber-600 text-stone-950 font-bold' : 'hover:bg-stone-800'}`}
              >
                Tarjeta Compacta
              </button>
              <button
                onClick={() => { handleStyleChange('split_top_bottom'); setShowStyleMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded ${selectedStyle === 'split_top_bottom' ? 'bg-amber-600 text-stone-950 font-bold' : 'hover:bg-stone-800'}`}
              >
                Split Superior / Inferior
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="bg-stone-800 hover:bg-stone-700 text-stone-300 p-1.5 rounded-full transition ml-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Área Central: Viewport de Cámara o Foto Estampada */}
      <div className="relative w-full max-w-3xl flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-stone-950 border border-stone-800 shadow-2xl">
        {previewPhoto ? (
          // Vista previa de la foto YA estampada
          <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
            <img
              src={previewPhoto}
              alt="Foto estampada"
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-stone-700"
            />
            <div className="absolute top-4 left-4 bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 backdrop-blur font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coordenadas y Datos Estampados</span>
            </div>
          </div>
        ) : cameraError ? (
          // Fallback si no hay cámara activa
          <div className="text-center p-6 max-w-md">
            <Camera className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-300 text-sm mb-4">{cameraError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 mx-auto text-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>Seleccionar Foto de la Galería</span>
            </button>
          </div>
        ) : (
          // Video en vivo con mira de telemetría en tiempo real
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover rounded-lg"
            />

            {/* Simulación visual de HUD de telemetría mientras encuadra */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-b from-black/40 via-transparent to-black/70">
              {/* Esquinas de enfoque estilo visor de teodolito */}
              <div className="absolute inset-8 border border-white/20 rounded-lg pointer-events-none">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400"></div>
              </div>

              {/* Encabezado en pantalla con Nombre del Punto y Fecha/Hora */}
              <div className="font-mono text-xs text-amber-300 flex justify-between items-center bg-black/75 px-3 py-2 rounded-lg backdrop-blur border border-stone-800">
                <span className="font-bold text-white">1. {waypoint.name || waypoint.pointCode || 'PTO-000'}</span>
                <span className="text-stone-300">3. {new Date().toLocaleDateString('es-ES')} {new Date().toLocaleTimeString('es-ES')}</span>
              </div>

              {/* Pie de pantalla con Elemento y Coordenadas */}
              <div className="bg-black/85 p-3 rounded-xl text-xs font-mono text-stone-200 border border-stone-700/80 backdrop-blur space-y-1">
                <div className="text-emerald-400 font-bold">
                  4. Elemento: {(waypoint.category || 'INFRAESTRUCTURA').toUpperCase().replace('_', ' ')}
                </div>
                <div className="text-cyan-300 font-semibold text-[11px]">
                  2. Coordenadas: {waypoint.latitude?.toFixed(6)}°, {waypoint.longitude?.toFixed(6)}°
                </div>
                {waypoint.utm?.formatted && (
                  <div className="text-amber-400 font-bold text-[10px]">
                    {waypoint.utm.formatted}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input oculto para subir foto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Barra Inferior: Disparador y Acciones */}
      <div className="w-full max-w-4xl py-3 px-4 flex items-center justify-around z-10">
        {previewPhoto ? (
          // Acciones después de tomar la foto
          <div className="flex items-center gap-4 w-full max-w-md justify-between">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2.5 rounded-lg text-xs font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tomar Otra</span>
            </button>

            <button
              onClick={handleDownloadDirect}
              title="Descargar imagen estampada a tu dispositivo"
              className="flex items-center gap-1.5 bg-stone-700 hover:bg-stone-600 text-amber-300 px-4 py-2.5 rounded-lg text-xs font-semibold transition"
            >
              <Download className="w-4 h-4" />
              <span>Descargar JPG</span>
            </button>

            <button
              onClick={handleConfirmPhoto}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold px-5 py-2.5 rounded-lg text-xs uppercase tracking-wide transition shadow-lg"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Usar Foto</span>
            </button>
          </div>
        ) : (
          // Acciones en modo cámara en vivo
          <div className="flex items-center justify-center gap-8 w-full">
            {/* Botón de subir archivo */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Cargar foto existente"
              className="bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 p-3 rounded-full transition"
            >
              <Upload className="w-5 h-5" />
            </button>

            {/* Disparador Central Gigante */}
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              title="Tomar foto y estampar coordenadas"
              className="relative w-18 h-18 rounded-full border-4 border-amber-400 bg-stone-900 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xl focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-inner">
                {isProcessing ? (
                  <RefreshCw className="w-6 h-6 text-stone-950 animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-stone-950" />
                )}
              </div>
            </button>

            {/* Alternar Cámara */}
            <button
              onClick={toggleFacingMode}
              title="Girar cámara trasera/frontal"
              className="bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 p-3 rounded-full transition"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
