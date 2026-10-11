import React from 'react';
import { Map, List, Crosshair, Download, Settings, Compass, Satellite } from 'lucide-react';

export type ActiveTab = 'map' | 'list' | 'export' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  waypointCount: number;
  onOpenCapture: () => void;
  projectName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  waypointCount,
  onOpenCapture,
  projectName,
}) => {
  return (
    <header className="bg-stone-950 border-b border-stone-800 text-stone-100 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14">
        {/* Logotipo e Identidad de Marca BackCountry GPS */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-stone-950 shadow-md">
            <Compass className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-sm tracking-tight text-white font-sans">
                BACKCOUNTRY
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1 py-0.2 rounded">
                GPS PRO
              </span>
            </div>
            <div className="text-[10px] text-stone-400 font-mono truncate max-w-[170px] sm:max-w-xs mt-0.5">
              {projectName || 'Levantamiento de Campo'}
            </div>
          </div>
        </div>

        {/* Botones de Navegación de Pestañas */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Pestaña: Mapa */}
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'map'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Mapa Topo</span>
          </button>

          {/* Pestaña: Lista de Puntos */}
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
              activeTab === 'list'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Puntos</span>
            {waypointCount > 0 && (
              <span className="bg-stone-800 text-amber-400 border border-stone-700 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                {waypointCount}
              </span>
            )}
          </button>

          {/* Botón Central Destacado: Marcar Punto GPS */}
          <button
            onClick={onOpenCapture}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold px-3 sm:px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider shadow-md transition mx-1"
          >
            <Crosshair className="w-4 h-4 stroke-[2.5]" />
            <span className="font-sans">Marcar</span>
          </button>

          {/* Pestaña: Exportar */}
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'export'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
            title="Exportar informes y fotos"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Exportar</span>
          </button>

          {/* Pestaña: Ajustes */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};
