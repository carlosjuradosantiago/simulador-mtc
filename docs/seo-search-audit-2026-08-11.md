# Auditoría de visibilidad SEO y buscadores de IA

Fecha de medición: 11 de agosto de 2026

## Resumen

- `simuladormtc.com` está indexado y aparece para consultas relacionadas con simulador MTC.
- En la muestra independiente de resultados web y búsquedas asistidas por IA apareció aproximadamente entre las posiciones 4 y 5, detrás del MTC y otros simuladores. Esta referencia no equivale a una posición universal: cambia por buscador, ubicación, historial y fecha.
- Google activó una comprobación de tráfico inusual durante la medición automatizada, por lo que no se registró una posición exacta de Google.
- Las páginas estáticas responden con HTML completo a Googlebot, OAI-SearchBot, Claude-SearchBot y PerplexityBot.
- No se encontraron menciones externas del dominio en la consulta de backlinks utilizada. La autoridad externa es hoy la mayor limitación.

## Problemas encontrados

1. Las páginas de categorías tenían títulos y textos demasiado parecidos.
2. Las búsquedas específicas por categoría tendían a mostrar la portada, no la página especializada.
3. No existían páginas centradas en responder una pregunta oficial completa.
4. Los CTA de páginas SEO enviaban a una ruta protegida antes del registro y podían perder la categoría elegida.
5. Faltaba una página visible de metodología editorial.

## Cambios aplicados

- Contenido único para A1, A2A, A2B, A3A, A3B, A3C, B2A, B2B y B2C.
- Cuatro páginas de preguntas oficiales con enunciado y alternativas completas, respuesta explicada y fuente primaria.
- Schema `Quiz`, `Question`, `LearningResource`, `WebPage` y datos editoriales conectados.
- Página de metodología, fuentes visibles, `publishingPrinciples`, `llms.txt` y permisos explícitos para rastreadores web y de IA.
- Registro preseleccionado por categoría desde cada página SEO.
- PDF oficiales con `noindex, follow` para concentrar la relevancia en páginas HTML explicativas y mantener los enlaces de consulta.

## Próxima medición

Revisar después del siguiente rastreo de buscadores:

- impresiones, clics, consultas y páginas en Google Search Console;
- posición de marca y consultas A1/A2/A3 en una ventana sin sesión;
- páginas citadas por ChatGPT Search, Perplexity y Claude Search;
- dominios externos que enlazan o mencionan la plataforma.

No se debe declarar una posición número uno sin evidencia reproducible. La publicación técnica ayuda a que el sitio pueda competir; la recrawl, la utilidad acumulada y las menciones externas determinan cuánto sube.
