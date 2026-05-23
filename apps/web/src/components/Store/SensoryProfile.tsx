"use client";

import { motion } from "framer-motion";
import { MEZCAL_COLORS, FONTS } from "./mezcal-constants";

interface Mezcal {
  id: number;
  nombre: string;
  precio: number;
  agave: string;
  region: string;
  maestro: string;
  edicion: string;
  botella_numero: number | null;
  notas: {
    aroma: string;
    sabor: string;
    cuerpo: number;
    final: number;
    complejidad: number;
  };
  descripcion: string;
  imagen: string;
  color: string;
}

interface Props {
  mezcal: Mezcal;
}

export default function SensoryProfile({ mezcal }: Props) {
  const { notas } = mezcal;
  const attributes = [
    { label: "Cuerpo", value: notas.cuerpo },
    { label: "Final", value: notas.final },
    { label: "Complejidad", value: notas.complejidad },
  ];

  const maxValue = 10;
  const centerX = 200;
  const centerY = 200;
  const radius = 140;

  // Calcula puntos del polígono
  const points = attributes.map((attr, idx) => {
    const angle = (idx / attributes.length) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * (radius * (attr.value / maxValue));
    const y = centerY + Math.sin(angle) * (radius * (attr.value / maxValue));
    return { x, y, ...attr };
  });

  const polygonPath = [
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[0].x},${points[0].y}`,
  ].join(" ");

  // Grid lines (círculos concéntricos)
  const gridCircles = [2, 4, 6, 8, 10].map((val) => ({
    r: (radius * val) / maxValue,
    label: val,
  }));

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Gráfico radial */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <svg width={400} height={400} viewBox="0 0 400 400" className="drop-shadow-lg">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={MEZCAL_COLORS.gold_mineral}
            strokeWidth="1"
            opacity="0.2"
          />

          {/* Grid circles */}
          {gridCircles.map((circle, idx) => (
            <g key={`grid-${idx}`}>
              <circle
                cx={centerX}
                cy={centerY}
                r={circle.r}
                fill="none"
                stroke={MEZCAL_COLORS.gold_mineral}
                strokeWidth="0.5"
                opacity="0.15"
              />
              <text
                x={centerX + circle.r}
                y={centerY - 5}
                fill={MEZCAL_COLORS.gold_mineral}
                fontSize="10"
                opacity="0.5"
                textAnchor="middle"
              >
                {circle.label}
              </text>
            </g>
          ))}

          {/* Radial lines to labels */}
          {attributes.map((attr, idx) => {
            const angle = (idx / attributes.length) * Math.PI * 2 - Math.PI / 2;
            const endX = centerX + Math.cos(angle) * radius;
            const endY = centerY + Math.sin(angle) * radius;
            return (
              <line
                key={`radial-${idx}`}
                x1={centerX}
                y1={centerY}
                x2={endX}
                y2={endY}
                stroke={MEZCAL_COLORS.gold_mineral}
                strokeWidth="0.5"
                opacity="0.2"
              />
            );
          })}

          {/* Polygon animated */}
          <motion.polygon
            points={polygonPath}
            fill={MEZCAL_COLORS.gold_mineral}
            fillOpacity="0.15"
            stroke={MEZCAL_COLORS.gold_mineral}
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            filter="url(#glow)"
          />

          {/* Points */}
          {points.map((point, idx) => (
            <motion.circle
              key={`point-${idx}`}
              cx={point.x}
              cy={point.y}
              r="6"
              fill={MEZCAL_COLORS.gold_mineral}
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 6, opacity: 1 }}
              transition={{ delay: 0.4 + idx * 0.1, duration: 0.4 }}
            />
          ))}

          {/* Labels */}
          {attributes.map((attr, idx) => {
            const angle = (idx / attributes.length) * Math.PI * 2 - Math.PI / 2;
            const labelRadius = radius + 40;
            const labelX = centerX + Math.cos(angle) * labelRadius;
            const labelY = centerY + Math.sin(angle) * labelRadius;

            return (
              <motion.g key={`label-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + idx * 0.1 }}>
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill={MEZCAL_COLORS.white_broken}
                  fontSize="14"
                  fontWeight="600"
                  fontFamily={FONTS.sans}
                >
                  {attr.label}
                </text>
                <text
                  x={labelX}
                  y={labelY + 16}
                  textAnchor="middle"
                  fill={MEZCAL_COLORS.gold_mineral}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily={FONTS.mono}
                >
                  {attr.value}/10
                </text>
              </motion.g>
            );
          })}
        </svg>
      </motion.div>

      {/* Información textual */}
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div>
          <h3
            className="text-2xl font-bold mb-4"
            style={{
              color: MEZCAL_COLORS.white_broken,
              fontFamily: FONTS.serif,
            }}
          >
            Análisis Sensorial
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{
              color: MEZCAL_COLORS.gray_light,
              fontFamily: FONTS.sans,
            }}
          >
            Una radiografía completa del perfil de sabor y características de este mezcal premium.
          </p>
        </div>

        {/* Atributos detallados */}
        <div className="space-y-4">
          {attributes.map((attr, idx) => (
            <motion.div
              key={`detail-${idx}`}
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
            >
              <div className="flex justify-between items-center">
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: MEZCAL_COLORS.gold_mineral,
                    fontFamily: FONTS.mono,
                  }}
                >
                  {attr.label.toUpperCase()}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{
                    color: MEZCAL_COLORS.gold_mineral,
                    fontFamily: FONTS.mono,
                  }}
                >
                  {attr.value}/10
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: MEZCAL_COLORS.charcoal }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: MEZCAL_COLORS.gold_mineral }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(attr.value / 10) * 100}%` }}
                  transition={{ delay: 0.6 + idx * 0.1, duration: 0.8 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Notas textuales */}
        <div
          className="p-4 rounded border-l-4"
          style={{
            borderColor: MEZCAL_COLORS.gold_mineral,
            backgroundColor: `${MEZCAL_COLORS.gold_mineral}15`,
          }}
        >
          <p
            className="text-xs font-mono mb-2"
            style={{ color: MEZCAL_COLORS.gold_mineral }}
          >
            IMPRESIÓN GENERAL
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{
              color: MEZCAL_COLORS.white_broken,
              fontFamily: FONTS.sans,
            }}
          >
            {notas.aroma}. En boca: {notas.sabor}.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
