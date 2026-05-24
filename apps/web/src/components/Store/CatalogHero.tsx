'use client';

export function CatalogHero() {
  // Translations - Replace with useTranslations() hook when i18n is configured
  const t = (key: string, fallback: string) => fallback;

  return (
    <section className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50">
      {/* Background texture overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="texture" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#8B7445" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#texture)" />
        </svg>
      </div>

      {/* Decorative earth shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-terracotta-100 to-transparent rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-nature-100 to-transparent rounded-full blur-3xl opacity-20" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Subtitle */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium tracking-widest text-nature-600 uppercase mb-4">
            {t('hero.subtitle', 'Mezcal Artesanal de Oaxaca')}
          </p>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-earth-900 mb-4">
            <span className="block font-serif">{t('hero.title', 'Historias en Botellas')}</span>
            <span className="block text-lg sm:text-xl md:text-2xl font-light text-earth-600 mt-2 font-sans">
              {t('hero.description', 'Mezcal Ancestral y Artesanal desde Productores Oaxaqueños')}
            </span>
          </h1>

          {/* Secondary text */}
          <p className="max-w-2xl mx-auto mt-6 text-base sm:text-lg text-earth-700 leading-relaxed">
            {t('hero.intro', 'Descubre la esencia de Oaxaca en cada copa. Cada botella es el resultado de tradición, oficio y respeto por la naturaleza.')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <button
            className="px-8 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-medium rounded-lg transition-colors duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta-500"
            aria-label={t('hero.explore', 'Explorar Catálogo')}
          >
            {t('hero.explore', 'Explorar Catálogo')}
          </button>
          <button
            className="px-8 py-3 border-2 border-earth-700 text-earth-700 hover:bg-earth-50 font-medium rounded-lg transition-colors duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-300"
            aria-label={t('hero.learnMore', 'Conocer más')}
          >
            {t('hero.learnMore', 'Conocer más')}
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-earth-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
