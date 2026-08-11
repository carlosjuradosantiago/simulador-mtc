# Auditoría de visibilidad SEO y buscadores de IA

Fecha de medición: 11 de agosto de 2026

## Resumen

- `simuladormtc.com` está indexado. En la medición posterior a la publicación, la consulta exacta `simulador MTC` lo mostró como primer resultado del buscador web asistido por IA utilizado.
- Ese puesto no equivale a una posición universal: cambia por buscador, ubicación, historial y fecha.
- Google devolvió una página de redirección durante la medición automatizada, sin resultados verificables. Por ese motivo no se asignó una posición exacta de Google.
- Las doce páginas temáticas nuevas fueron descubiertas y rastreadas por el buscador de IA desde los enlaces públicos de GitHub. Las leyó con las preguntas, cuatro alternativas y respuestas completas.
- Las páginas temáticas todavía no aparecían como resultados para sus títulos exactos inmediatamente después del rastreo.
- Googlebot, OAI-SearchBot, Claude-SearchBot y PerplexityBot reciben el mismo HTML completo.
- La autoridad externa continúa siendo la principal limitación para consultas genéricas competidas.

## Problemas encontrados

1. Las páginas de categorías tenían títulos y textos demasiado parecidos.
2. Las búsquedas específicas por categoría tendían a mostrar la portada, no la página especializada.
3. Faltaban páginas extensas organizadas por los temas reales del banco de preguntas.
4. Los CTA de páginas SEO enviaban a una ruta protegida antes del registro y podían perder la categoría elegida.
5. Faltaba una página visible de metodología editorial.
6. La portada estática no enlazaba las nuevas guías, por lo que un rastreador sin JavaScript debía descubrirlas desde otra página.

## Cambios aplicados

- Contenido único para A1, A2A, A2B, A3A, A3B, A3C, B2A, B2B y B2C.
- Cuatro páginas de preguntas oficiales con enunciado y alternativas completas, respuesta explicada y fuente primaria.
- Trescientas sesenta preguntas completas en las nueve páginas de categoría, 40 por licencia, comparadas con la extracción de los PDF sin diferencias.
- Cada pregunta de categoría muestra el balotario, número, página del PDF y tema de origen; se excluyen las que requieren una imagen ausente.
- Doce páginas por tema con 293 preguntas seleccionadas de un banco deduplicado de 655 registros.
- El generador exige enunciado, cuatro alternativas no vacías, una clave válida y ausencia de imágenes faltantes.
- Las pruebas comparan el texto visible y el schema `Quiz` con el banco fuente para impedir alteraciones silenciosas.
- Schema `Quiz`, `Question`, `LearningResource`, `WebPage` y datos editoriales conectados.
- Página de metodología, fuentes visibles, `publishingPrinciples`, `llms.txt` y permisos explícitos para rastreadores web y de IA.
- Enlaces internos desde la portada y enlaces públicos desde GitHub hacia las doce páginas temáticas.
- Registro preseleccionado por categoría desde cada página SEO.
- PDF oficiales con `noindex, follow` para concentrar la relevancia en páginas HTML explicativas y mantener los enlaces de consulta.
- Sitemap con 59 URLs aceptado por IndexNow con estado HTTP 200.

## Evidencia de despliegue

- Las doce rutas temáticas responden con HTTP 200 y canonical propio.
- La página de Reglamento de tránsito contiene 40 preguntas, 160 alternativas y 40 respuestas visibles.
- Las variantes con barra final y las rutas internas `/seo/` redirigen con HTTP 308 a la URL canónica.
- Los cuatro rastreadores comprobados reciben las 40 preguntas completas.
- Las doce páginas fueron rastreadas por el buscador de IA el mismo día de la publicación.

## Próxima medición

Revisar después del siguiente ciclo de indexación:

- impresiones, clics, consultas y páginas en Google Search Console;
- posición de marca y consultas A1, A2 y A3 en una ventana sin sesión;
- aparición de las doce páginas temáticas por título y por consultas no de marca;
- páginas citadas por ChatGPT Search, Perplexity y Claude Search;
- dominios externos que enlazan o mencionan la plataforma.

No se debe declarar una posición número uno en Google sin evidencia reproducible. La publicación técnica permite competir; el nuevo rastreo, la utilidad acumulada y las menciones externas determinan cuánto sube.
