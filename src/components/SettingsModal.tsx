import React, { useState } from 'react';
import { ProjectSettings, StampStyle } from '../types';
import { Settings, Save, Trash2, Database, Sliders, X, Check, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  settings: ProjectSettings;
  onSaveSettings: (settings: ProjectSettings) => void;
  onClearAllData: () => void;
  onLoadDemoData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClearAllData,
  onLoadDemoData,
  onClose,
}) => {
  const [formState, setFormState] = useState<ProjectSettings>({ ...settings });
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formState);
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-lg w-full p-5 shadow-2xl text-stone-200 space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Configuración de Campo y Estampado
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Nombre de Proyecto */}
          <div>
            <label className="block font-semibold text-stone-300 mb-1">
              Nombre de Proyecto Predeterminado
            </label>
            <input
              type="text"
              value={formState.projectName}
              onChange={(e) => setFormState({ ...formState, projectName: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Inspector Predeterminado */}
          <div>
            <label className="block font-semibold text-stone-300 mb-1">
              Inspector / Topógrafo Responsable
            </label>
            <input
              type="text"
              value={formState.defaultInspector}
              onChange={(e) => setFormState({ ...formState, defaultInspector: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Prefijo y Numeración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Prefijo Código de Punto
              </label>
              <input
                type="text"
                value={formState.pointCodePrefix}
                onChange={(e) => setFormState({ ...formState, pointCodePrefix: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Próximo Número Correlativo
              </label>
              <input
                type="number"
                min="1"
                value={formState.nextPointNumber}
                onChange={(e) => setFormState({ ...formState, nextPointNumber: parseInt(e.target.value) || 1 })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Estilo Predeterminado de Estampa */}
          <div>
            <label className="block font-semibold text-stone-300 mb-1">
              Diseño de Estampado de Coordenadas en Foto
            </label>
            <select
              value={formState.stampStyle}
              onChange={(e) => setFormState({ ...formState, stampStyle: e.target.value as StampStyle })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 capitalize"
            >
              <option value="banner_solocator">Banner Solocator Pro (Cinta técnica inferior con telemetría doble columna)</option>
              <option value="hud_theodolite">Teodolito HUD Militar (Mira central y bandas superior/inferior)</option>
              <option value="card_compact">Tarjeta Técnica Flotante (Esquina inferior)</option>
              <option value="split_top_bottom">Split Dual (Encabezado superior y telemetría inferior)</option>
            </select>
          </div>

          {/* Opacidad del sello */}
          <div>
            <div className="flex justify-between text-stone-300 mb-1">
              <span>Opacidad del Fondo de Datos en Foto:</span>
              <span className="font-mono text-amber-400">{Math.round(formState.stampOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={formState.stampOpacity}
              onChange={(e) => setFormState({ ...formState, stampOpacity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Botones de acción general */}
          <div className="border-t border-stone-800 pt-3 space-y-2">
            <label className="font-semibold text-stone-400 block">Datos y Pruebas:</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Cargar puntos de demostración de levantamiento con fotos de prueba?')) {
                    onLoadDemoData();
                    onClose();
                  }
                }}
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Cargar Datos de Demostración</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('¡PELIGRO! ¿Estás seguro de que deseas eliminar TODOS los puntos y fotos guardados? Esta acción es irreversible.')) {
                    onClearAllData();
                    onClose();
                  }
                }}
                className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar Todos los Datos</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-5 py-2 rounded-lg text-xs uppercase flex items-center gap-1.5 transition"
            >
              {savedAlert ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedAlert ? 'Guardado' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
