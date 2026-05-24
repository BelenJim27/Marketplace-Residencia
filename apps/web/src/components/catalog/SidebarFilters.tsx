"use client";

import { Search, HelpCircle } from "lucide-react";
import { useState } from "react";

interface SidebarFiltersProps {
  filtrosPendientes: {
    busqueda: string;
    maguey: string[];
    precio_min: string;
    precio_max: string;
  };
  onBusquedaChange: (value: string) => void;
  onFiltroToggle: (field: string, value: string) => void;
  searchFocus: boolean;
  onSearchFocus: (focused: boolean) => void;
  precioMinLocal: string;
  precioMaxLocal: string;
  onPrecioMinChange: (value: string) => void;
  onPrecioMaxChange: (value: string) => void;
  onAplicarPrecio: () => void;
  TIPOS_MAGUEY: string[];
}

function FilterCheckbox({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all hover:bg-white/50 text-left w-full"
      style={{
        color: active ? "#c97a49" : "#8b6914",
        fontWeight: active ? 600 : 500,
      }}
    >
      <div
        className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: active ? "#c97a49" : "#d4a574",
          backgroundColor: active ? "#c97a49" : "transparent",
        }}
      >
        {active && <span className="text-white text-xs">✓</span>}
      </div>
      {label}
    </button>
  );
}

// P3: Tooltip component for filter help text
function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        {children}
      </div>
      {showTooltip && (
        <div
          className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2.5 text-xs z-50 animate-in fade-in duration-150"
          style={{
            borderColor: "#e8dcc8",
            color: "#5c3d1e",
            maxWidth: "200px",
            minWidth: "150px",
          }}
          role="tooltip"
        >
          {text}
          <div
            className="absolute top-full left-3 w-2 h-2 bg-white transform rotate-45"
            style={{ borderRight: "1px solid #e8dcc8", borderBottom: "1px solid #e8dcc8" }}
          />
        </div>
      )}
    </div>
  );
}

function FilterSection({
  title,
  tooltip,
  children,
  defaultOpen = true,
}: {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b py-3" style={{ borderColor: "#e8dcc8" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-1 py-1.5 text-sm font-bold transition-colors hover:text-opacity-80"
        style={{ color: "#5c3d1e" }}
      >
        <div className="flex items-center gap-1.5">
          <span>{title}</span>
          {tooltip && (
            <Tooltip text={tooltip}>
              <HelpCircle size={14} style={{ color: "#c97a49", opacity: 0.7 }} />
            </Tooltip>
          )}
        </div>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      {isOpen && <div className="pt-2">{children}</div>}
    </div>
  );
}

function PriceRangeSlider({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onApply,
}: {
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  onApply: () => void;
}) {
  // P4: Price validation
  const minNum = Number(minValue) || 0;
  const maxNum = Number(maxValue) || 5000;
  const hasError = minNum > maxNum;

  return (
    <div className="space-y-3 px-1 pt-1">
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          Mínimo: ${minNum.toLocaleString("es-MX")}
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          className="w-full accent-orange-400"
          style={{ borderColor: hasError ? "#e74c3c" : undefined }}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          Máximo: ${maxNum.toLocaleString("es-MX")}
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          className="w-full accent-orange-400"
          style={{ borderColor: hasError ? "#e74c3c" : undefined }}
        />
      </div>
      {/* P4: Price validation error message */}
      {hasError && (
        <div className="text-xs font-semibold" style={{ color: "#e74c3c" }}>
          El precio mínimo debe ser menor al máximo. Ajusta los valores.
        </div>
      )}
      <button
        onClick={onApply}
        disabled={hasError}
        className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
        style={{
          backgroundColor: hasError ? "#d0d0d0" : "#c97a49",
          cursor: hasError ? "not-allowed" : "pointer",
          opacity: hasError ? 0.6 : 1,
        }}
      >
        Aplicar
      </button>
    </div>
  );
}

export function SidebarFiltersComponent({
  filtrosPendientes,
  onBusquedaChange,
  onFiltroToggle,
  searchFocus,
  onSearchFocus,
  precioMinLocal,
  precioMaxLocal,
  onPrecioMinChange,
  onPrecioMaxChange,
  onAplicarPrecio,
  TIPOS_MAGUEY,
}: SidebarFiltersProps) {
  return (
    <div className="space-y-1">
      <div className="mb-4 pb-4 border-b" style={{ borderColor: "#e8dcc8" }}>
        <div className="relative group">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
            style={{ color: searchFocus ? "#c97a49" : "#d4a574" }}
          />
          <input
            type="text"
            placeholder="Buscar mezcal..."
            value={filtrosPendientes.busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            onFocus={() => onSearchFocus(true)}
            onBlur={() => onSearchFocus(false)}
            className="w-full rounded-xl py-2.5 pl-11 pr-4 text-sm outline-none font-medium transition-all duration-200"
            style={{
              backgroundColor: searchFocus ? "#fffbf8" : "#fff8f3",
              border: searchFocus ? "1.5px solid #c97a49" : "1.5px solid #e8dcc8",
              color: "#5c3d1e",
            }}
          />
        </div>
      </div>

      <FilterSection
        title="Maguey"
        tooltip="El tipo de agave usado. Cada variedad tiene sabor único."
      >
        <div className="space-y-0.5 px-1">
          {TIPOS_MAGUEY.map((m) => (
            <FilterCheckbox
              key={m}
              label={m}
              active={filtrosPendientes.maguey.includes(m)}
              onClick={() => onFiltroToggle("maguey", m)}
            />
          ))}
        </div>
      </FilterSection>


      <FilterSection
        title="Rango de Precio"
        tooltip="Rango de precio en pesos mexicanos (MXN)."
      >
        <PriceRangeSlider
          minValue={precioMinLocal}
          maxValue={precioMaxLocal}
          onMinChange={onPrecioMinChange}
          onMaxChange={onPrecioMaxChange}
          onApply={onAplicarPrecio}
        />
      </FilterSection>

    </div>
  );
}
