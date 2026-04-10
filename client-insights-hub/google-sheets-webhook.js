// Función para crear la pausa de 15 segundos
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function importarBaseDeDatos(listaDeClientes) {
  console.log("Iniciando importación: 1 cliente cada 15 segundos...");

  for (let i = 0; i < listaDeClientes.length; i++) {
    const cliente = listaDeClientes[i];

    try {
      console.log(`Enviando cliente ${i + 1} de ${listaDeClientes.length}: ${cliente.firstName || 'Sin nombre'}`);

      // Llamada a tu Web App de Google
      const response = await fetch('TU_URL_DE_GOOGLE_SCRIPT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cliente)
      });

      const resultado = await response.json();
      console.log(`Respuesta de Google para cliente ${i + 1}:`, resultado.status);

      // --- LA PAUSA DE 15 SEGUNDOS ---
      if (i < listaDeClientes.length - 1) { // No esperar en el último cliente
        console.log("Esperando 15 segundos para no saturar Google Sheets...");
        await delay(15000); 
      }

    } catch (error) {
      console.error(`Error con el cliente ${i + 1}:`, error);
      // En caso de error, esperamos un poco más antes de seguir con el siguiente
      await delay(5000);
    }
  }

  alert("¡Importación completa! Todos los clientes han sido procesados.");
}