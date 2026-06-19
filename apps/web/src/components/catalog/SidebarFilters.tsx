"use client";

import { Search, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "@/context/LocaleContext";

function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "dark";
}

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
  categorias?: Array<{ id_categoria: number; nombre: string }>;
  selectedCategorias?: string[];
  onCategoriasChange?: (ids: string[]) => void;
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
  const isDark = useIsDark();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all hover:bg-white/10 text-left w-full"
      style={{
        color: active ? "#C97A3E" : isDark ? "#e5e7eb" : "#3D6B3F",
        fontWeight: active ? 600 : 500,
      }}
    >
      <div
        className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: active ? "#C97A3E" : isDark ? "rgba(255,255,255,0.4)" : "#A8C26B",
          backgroundColor: active ? "#C97A3E" : "transparent",
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
  const isDark = useIsDark();

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
          className="absolute bottom-full left-0 mb-2 rounded-lg shadow-lg border p-2.5 text-xs z-50 animate-in fade-in duration-150"
          style={{
            backgroundColor: isDark ? "#1e2820" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "#C5CFB0",
            color: isDark ? "#e5e7eb" : "#1F3A2E",
            maxWidth: "200px",
            minWidth: "150px",
          }}
          role="tooltip"
        >
          {text}
          <div
            className="absolute top-full left-3 w-2 h-2 transform rotate-45"
            style={{
              backgroundColor: isDark ? "#1e2820" : "#ffffff",
              borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#C5CFB0"}`,
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#C5CFB0"}`,
            }}
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
  const isDark = useIsDark();

  return (
    <div className="border-b py-3" style={{ borderColor: isDark ? "rgba(255,255,255,0.12)" : "#C5CFB0" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-1 py-1.5 text-sm font-bold transition-colors hover:opacity-80"
        style={{ color: isDark ? "#e5e7eb" : "#1F3A2E" }}
      >
        <div className="flex items-center gap-1.5">
          <span>{title}</span>
          {tooltip && (
            <Tooltip text={tooltip}>
              <HelpCircle size={14} style={{ color: "#C97A3E", opacity: 0.7 }} />
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
  const { t } = useLocale();
  const isDark = useIsDark();
  const minNum = Number(minValue) || 0;
  const maxNum = Number(maxValue) || 5000;
  const hasError = minNum > maxNum;

  return (
    <div className="space-y-3 px-1 pt-1">
      <div>
        <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          {t("filters_minimum")} ${minNum.toLocaleString("es-MX")}
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
        <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          {t("filters_maximum")} ${maxNum.toLocaleString("es-MX")}
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
          {t("filters_min_greater_than_max")}
        </div>
      )}
      <button
        onClick={onApply}
        disabled={hasError}
        className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
        style={{
          backgroundColor: hasError ? "#d0d0d0" : "#C97A3E",
          cursor: hasError ? "not-allowed" : "pointer",
          opacity: hasError ? 0.6 : 1,
        }}
      >
        {t("filters_apply")}
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
  categorias = [],
  selectedCategorias = [],
  onCategoriasChange,
}: SidebarFiltersProps) {
  const { t } = useLocale();

  const handleCategoriaToggle = (id: string) => {
    if (!onCategoriasChange) return;
    const next = selectedCategorias.includes(id)
      ? selectedCategorias.filter((v) => v !== id)
      : [...selectedCategorias, id];
    onCategoriasChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <SearchBarComponent
        busqueda={filtrosPendientes.busqueda}
        onBusquedaChange={onBusquedaChange}
        searchFocus={searchFocus}
        onSearchFocus={onSearchFocus}
      />

      {categorias.length > 0 && (
        <FilterSection title="Categoría" defaultOpen={false}>
          <div className="space-y-0.5 px-1">
            {categorias.map((cat) => (
              <FilterCheckbox
                key={cat.id_categoria}
                label={cat.nombre}
                active={false}
                onClick={() => { }}
              />
            ))}
          </div>
          <p className="text-[15px] px-2 pt-2 pb-1 italic" style={{ color: "#a71010" }}>
            🌿 Filtro por categoría disponible próximamente
          </p>
        </FilterSection>
      )}

      <FilterSection
        title={t("filters_title")}
        tooltip={t("filters_agave_tooltip")}
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
        title={t("filters_price_range")}
        tooltip={t("filters_price_tooltip")}
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

export function SearchBarComponent({
  busqueda,
  onBusquedaChange,
  searchFocus,
  onSearchFocus,
}: {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  searchFocus: boolean;
  onSearchFocus: (focused: boolean) => void;
}) {
  const { t } = useLocale();
  const isDark = useIsDark();

  return (
    <div className="relative group">
      {/* Shadow effect on focus */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 transition-all duration-300 pointer-events-none"
        style={{
          backgroundColor: "#C97A3E",
          opacity: searchFocus ? 0.1 : 0,
          filter: "blur(8px)",
        }}
      />

      <Search
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10"
        style={{ color: searchFocus ? "#C97A3E" : isDark ? "rgba(255,255,255,0.5)" : "#A8C26B" }}
      />
      <input
        type="text"
        placeholder={t("filters_search_placeholder")}
        value={busqueda}
        onChange={(e) => onBusquedaChange(e.target.value)}
        onFocus={() => onSearchFocus(true)}
        onBlur={() => onSearchFocus(false)}
        className="w-full rounded-2xl py-3 sm:py-3.5 pl-13 pr-4 text-sm sm:text-base outline-none font-medium transition-all duration-300"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#F4F0E3",
          border: searchFocus ? "2px solid #C97A3E" : `1.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "#C5CFB0"}`,
          color: isDark ? "#e5e7eb" : "#1F3A2E",
          boxShadow: searchFocus ? "0 4px 12px rgba(201, 122, 73, 0.1)" : "0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      />

      {/* Placeholder hint */}
      {!busqueda && !searchFocus && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none hidden sm:block">

        </div>
      )}
    </div>
  );
}
