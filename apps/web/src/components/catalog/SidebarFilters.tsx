"use client";

import { Search, HelpCircle, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

interface SidebarFiltersProps {
  filtrosPendientes: {
    busqueda: string;
    maguey: string[];
    destilacion: string[];
    molienda: string[];
    precio_min: string;
    precio_max: string;
    maestro_mezcalero: string;
  };
  onBusquedaChange: (value: string) => void;
  onFiltroToggle: (field: string, value: string) => void;
  onMaestroChange: (value: string) => void;
  searchFocus: boolean;
  onSearchFocus: (focused: boolean) => void;
  precioMinLocal: string;
  precioMaxLocal: string;
  onPrecioMinChange: (value: string) => void;
  onPrecioMaxChange: (value: string) => void;
  onAplicarPrecio: () => void;
  TIPOS_MAGUEY: string[];
  TIPOS_DESTILACION: string[];
  TIPOS_MOLIENDA: string[];
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
        color: active ? "#306B3F" : "#1F3A2E",
        fontWeight: active ? 600 : 500,
      }}
    >
      <div
        className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: active ? "#306B3F" : "#A8C26B",
          backgroundColor: active ? "#306B3F" : "transparent",
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
            borderColor: "#ddd8c4",
            color: "#1F3A2E",
            maxWidth: "200px",
            minWidth: "150px",
          }}
          role="tooltip"
        >
          {text}
          <div
            className="absolute top-full left-3 w-2 h-2 bg-white transform rotate-45"
            style={{ borderRight: "1px solid #ddd8c4", borderBottom: "1px solid #ddd8c4" }}
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
    <div className="border-b py-3" style={{ borderColor: "#ddd8c4" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-1 py-1.5 text-sm font-bold transition-colors hover:text-opacity-80"
        style={{ color: "#1F3A2E" }}
      >
        <div className="flex items-center gap-1.5">
          <span>{title}</span>
          {tooltip && (
            <Tooltip text={tooltip}>
              <HelpCircle size={14} style={{ color: "#306B3F", opacity: 0.7 }} />
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

// P4: Combobox component for Maestro with autocomplete
interface Productor {
  id: number;
  nombre: string;
  usuario?: { nombre?: string; apellido_paterno?: string };
}

function MaestroCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Productor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await api.productores.getAll({ busqueda: query, limit: 8 });
        setSuggestions((data as unknown as Productor[]).slice(0, 8));
        setIsOpen(true);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const debouncedFetch = useCallback(() => {
    const timer = setTimeout(() => fetchSuggestions(value), 300);
    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  useEffect(() => {
    return debouncedFetch();
  }, [debouncedFetch]);

  const handleSelect = (productor: Productor) => {
    onChange(productor.nombre);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative pt-1">
      <div className="relative">
        <input
          type="text"
          placeholder="Nombre..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 2 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          className="w-full rounded-lg py-2 px-3 text-sm outline-none pr-8"
          style={{
            backgroundColor: "#F4F0E3",
            border: "1px solid #ddd8c4",
            color: "#1F3A2E",
          }}
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
            aria-label="Limpiar"
          >
            <X size={14} style={{ color: "#306B3F" }} />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-40 overflow-y-auto"
          style={{ borderColor: "#ddd8c4" }}
          role="listbox"
        >
          {isLoading ? (
            <div className="p-3 text-xs text-gray-500 text-center">Buscando...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((productor, index) => (
              <button
                key={productor.id || `productor-${index}`}
                onClick={() => handleSelect(productor)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors"
                style={{ color: "#1F3A2E" }}
                role="option"
              >
                <div className="font-medium">{productor.nombre}</div>
                {productor.usuario?.nombre && (
                  <div className="text-xs opacity-70">
                    {productor.usuario.nombre} {productor.usuario.apellido_paterno}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-gray-500 text-center">
              {value.length < 2 ? "Escribe al menos 2 caracteres" : "No encontrado"}
            </div>
          )}
        </div>
      )}
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
          className="w-full accent-green-600"
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
          className="w-full accent-green-600"
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
          backgroundColor: hasError ? "#d0d0d0" : "#306B3F",
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
  onMaestroChange,
  searchFocus,
  onSearchFocus,
  precioMinLocal,
  precioMaxLocal,
  onPrecioMinChange,
  onPrecioMaxChange,
  onAplicarPrecio,
  TIPOS_MAGUEY,
  TIPOS_DESTILACION,
  TIPOS_MOLIENDA,
}: SidebarFiltersProps) {
  return (
    <div className="space-y-1">
      <div className="mb-4 pb-4 border-b" style={{ borderColor: "#ddd8c4" }}>
        <div className="relative group">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
            style={{ color: searchFocus ? "#306B3F" : "#A8C26B" }}
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
              backgroundColor: searchFocus ? "#f0f8ec" : "#F4F0E3",
              border: searchFocus ? "1.5px solid #306B3F" : "1.5px solid #ddd8c4",
              color: "#1F3A2E",
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
        title="Destilación"
        tooltip="Método de destilación: Alambique (cobre, lento, suave), Artefacto (eficiente), Cambio (híbrido)."
      >
        <div className="space-y-0.5 px-1">
          {TIPOS_DESTILACION.map((d) => (
            <FilterCheckbox
              key={d}
              label={d}
              active={filtrosPendientes.destilacion.includes(d)}
              onClick={() => onFiltroToggle("destilacion", d)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Molienda"
        tooltip="Cómo se muele el agave: Tahona (piedra), Molino de piedra, Molino mecánico, Manual."
      >
        <div className="space-y-0.5 px-1">
          {TIPOS_MOLIENDA.map((m) => (
            <FilterCheckbox
              key={m}
              label={m}
              active={filtrosPendientes.molienda.includes(m)}
              onClick={() => onFiltroToggle("molienda", m)}
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

      <FilterSection
        title="Maestro Mezcalero"
        defaultOpen={false}
        tooltip="Productor artesanal que hace este mezcal."
      >
        <div className="px-1 pt-1">
          <MaestroCombobox
            value={filtrosPendientes.maestro_mezcalero}
            onChange={onMaestroChange}
          />
        </div>
      </FilterSection>
    </div>
  );
}
