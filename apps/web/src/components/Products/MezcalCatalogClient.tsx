'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import '@/styles/mezcal-catalog.css';
import styles from './MezcalCatalog.module.css';

interface MezcalProduct {
  id: string;
  nombre: string;
  precio: number;
  agave: string;
  origen: string;
  alcohol: number;
  rating: number;
  imagen: string;
  categoria: 'artesanal' | 'ancestral' | 'mezcal';
  notas?: string[];
}

const MEZCAL_PRODUCTS: MezcalProduct[] = [
  {
    id: '1',
    nombre: 'Espíritu de Agave',
    precio: 580,
    agave: 'Espadin',
    origen: 'Santa María Atzompa',
    alcohol: 47,
    rating: 4.8,
    imagen: '/placeholder-bottle.jpg',
    categoria: 'artesanal',
    notas: ['Ahumado', 'Mineral'],
  },
  {
    id: '2',
    nombre: 'Ancestral Oaxaqueño',
    precio: 720,
    agave: 'Madre Cuishe',
    origen: 'San Luis Matlatlán',
    alcohol: 49,
    rating: 4.9,
    imagen: '/placeholder-bottle.jpg',
    categoria: 'ancestral',
    notas: ['Complejo', 'Terroir'],
  },
  {
    id: '3',
    nombre: 'Tierra Pura',
    precio: 450,
    agave: 'Espadin',
    origen: 'Villa Díaz Ordaz',
    alcohol: 45,
    rating: 4.6,
    imagen: '/placeholder-bottle.jpg',
    categoria: 'mezcal',
    notas: ['Suave', 'Fresco'],
  },
  {
    id: '4',
    nombre: 'Raíces Profundas',
    precio: 850,
    agave: 'Tepeztate',
    origen: 'San Bartolo Yautepec',
    alcohol: 50,
    rating: 5.0,
    imagen: '/placeholder-bottle.jpg',
    categoria: 'ancestral',
    notas: ['Raro', 'Intenso'],
  },
  {
    id: '5',
    nombre: 'Destello de Oaxaca',
    precio: 520,
    agave: 'Espadin',
    origen: 'Santiago Matatlán',
    alcohol: 46,
    rating: 4.7,
    imagen: '/placeholder-bottle.jpg',
    categoria: 'artesanal',
    notas: ['Ahumado suave', 'Dulce'],
  },
  {
    id: '6',
    nombre: 'Legado Ancestral',
    precio: 920,
    agave: 'Papalote',
    origen: 'Oaxaca Centro',
    alcohol: 51,
    rating: 4.9,
    imagen: '/placeholder-bottle.jpg',
    categoria: 'ancestral',
    notas: ['Herbáceo', 'Sofisticado'],
  },
];

const CATEGORIES = ['todos', 'artesanal', 'ancestral', 'mezcal'];
const PRICE_RANGES = [
  { label: 'Todos', min: 0, max: Infinity },
  { label: '$400 - $600', min: 400, max: 600 },
  { label: '$600 - $800', min: 600, max: 800 },
  { label: '$800+', min: 800, max: Infinity },
];

export default function MezcalCatalogClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [cartItems, setCartItems] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    return MEZCAL_PRODUCTS.filter((product) => {
      const matchesSearch =
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.agave.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.origen.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'todos' || product.categoria === selectedCategory;

      const priceRange = PRICE_RANGES[selectedPrice];
      const matchesPrice =
        product.precio >= priceRange.min && product.precio <= priceRange.max;

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [searchTerm, selectedCategory, selectedPrice]);

  const toggleCart = (id: string) => {
    setCartItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Mezcal de Oaxaca</h1>
            <p className={styles.heroSubtitle}>
              Espíritu artesanal de generaciones
            </p>
            <p className={styles.heroDescription}>
              Cada botella cuenta la historia del agave y la tradición oaxaqueña.
              Descubre destilados únicos, elaborados con técnicas ancestrales.
            </p>
          </div>
          <div className={styles.heroDecor}>
            <div className={styles.decorLine}></div>
            <div className={styles.decorPattern}>◆</div>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className={styles.filterSection}>
        <div className={styles.searchContainer}>
          <div className={styles.searchInput}>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Busca por nombre, agave, origen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInputField}
            />
          </div>
        </div>

        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Tipo</label>
            <div className={styles.filterOptions}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.filterButton} ${
                    selectedCategory === cat ? styles.active : ''
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Rango de Precio</label>
            <div className={styles.filterOptions}>
              {PRICE_RANGES.map((range, idx) => (
                <button
                  key={idx}
                  className={`${styles.filterButton} ${
                    selectedPrice === idx ? styles.active : ''
                  }`}
                  onClick={() => setSelectedPrice(idx)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.resultCount}>
          {filteredProducts.length} producto
          {filteredProducts.length !== 1 ? 's' : ''} encontrado
          {filteredProducts.length !== 1 ? 's' : ''}
        </div>
      </section>

      {/* CATALOG GRID */}
      <section className={styles.catalogSection}>
        <div className={styles.catalogGrid}>
          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.cardInner}>
                {/* LEFT: BOTTLE IMAGE */}
                <div
                  className={styles.bottleSection}
                  style={{
                    backgroundColor: getCategoryColor(product.categoria),
                  }}
                >
                  <div className={styles.bottleWrapper}>
                    <Image
                      src={product.imagen}
                      alt={product.nombre}
                      width={120}
                      height={280}
                      className={styles.bottleImage}
                      priority
                    />
                  </div>
                  <div className={styles.categoryBadge}>
                    {product.categoria.charAt(0).toUpperCase() +
                      product.categoria.slice(1)}
                  </div>
                </div>

                {/* RIGHT: PRODUCT INFO */}
                <div className={styles.infoSection}>
                  <div className={styles.infoContent}>
                    <h3 className={styles.productName}>{product.nombre}</h3>

                    <div className={styles.agaveType}>
                      <span className={styles.label}>Agave:</span>
                      <span className={styles.value}>{product.agave}</span>
                    </div>

                    <div className={styles.origin}>
                      <span className={styles.label}>Origen:</span>
                      <span className={styles.value}>{product.origen}</span>
                    </div>

                    <div className={styles.specs}>
                      <div className={styles.specItem}>
                        <span className={styles.specLabel}>Alcohol</span>
                        <span className={styles.specValue}>
                          {product.alcohol}%
                        </span>
                      </div>
                      <div className={styles.specDivider}></div>
                      <div className={styles.specItem}>
                        <span className={styles.specLabel}>Calificación</span>
                        <div className={styles.stars}>
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`${styles.star} ${
                                i < Math.round(product.rating)
                                  ? styles.filled
                                  : ''
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {product.notas && product.notas.length > 0 && (
                      <div className={styles.notas}>
                        {product.notas.map((nota, idx) => (
                          <span key={idx} className={styles.nota}>
                            {nota}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.footer}>
                    <div className={styles.priceSection}>
                      <span className={styles.currencySymbol}>$</span>
                      <span className={styles.price}>{product.precio}</span>
                      <span className={styles.currency}>MXN</span>
                    </div>

                    <button
                      className={`${styles.addToCartBtn} ${
                        cartItems.includes(product.id) ? styles.inCart : ''
                      }`}
                      onClick={() => toggleCart(product.id)}
                    >
                      {cartItems.includes(product.id) ? (
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="18"
                            height="18"
                          >
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          En carrito
                        </>
                      ) : (
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="18"
                            height="18"
                          >
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            <path d="M12 9v6M9 12h6"></path>
                          </svg>
                          Agregar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className={styles.emptyState}>
            <p>No se encontraron productos que coincidan con tu búsqueda.</p>
            <button
              className={styles.resetBtn}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('todos');
                setSelectedPrice(0);
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      {/* FOOTER NOTE */}
      <section className={styles.footerNote}>
        <p>
          Cada mezcal es una expresión única de la tierra oaxaqueña y la
          maestría de sus productores.
        </p>
      </section>
    </div>
  );
}

function getCategoryColor(categoria: string): string {
  const colors: Record<string, string> = {
    artesanal: '#D9CFBB',
    ancestral: '#E9B5A2',
    mezcal: '#F2F7F4',
  };
  return colors[categoria] || '#F7F5F2';
}
