// src/lib/test-api.ts
export async function testBackendConnection() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  console.log('🔍 Probando conexión con backend:', API_BASE);
  
  try {
    // Test de productos
    const productsResponse = await fetch(`${API_BASE}/products`);
    if (productsResponse.ok) {
      const products = await productsResponse.json();
      console.log('✅ Conexión exitosa - Productos obtenidos:', products.length || '0');
      console.log('📦 Datos:', products);
    } else {
      console.error(`❌ Error en /products - Status: ${productsResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}