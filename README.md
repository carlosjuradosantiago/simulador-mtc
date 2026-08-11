# Simulador MTC

[Simulador MTC](https://www.simuladormtc.com/) es una aplicación educativa independiente para practicar el examen de conocimientos de licencia de conducir en Perú.

La experiencia distingue dos formas de estudio:

- práctica corta de 5 preguntas, sin cronómetro y con explicación inmediata;
- simulacro de 40 preguntas en 40 minutos, usado para medir el avance real.

El usuario elige su licencia antes de comenzar. El banco se filtra para A1, A2A, A2B, A3A, A3B, A3C, B2A, B2B o B2C y conserva los enunciados y alternativas completos.

## Aplicación publicada

- Sitio: <https://www.simuladormtc.com/>
- Categorías y fuentes: <https://www.simuladormtc.com/fuentes-mtc>
- Metodología editorial: <https://www.simuladormtc.com/metodologia-simulador-mtc>

## Simuladores por licencia

- [A1, licencia A-I](https://www.simuladormtc.com/simulador-mtc-a1)
- [A2A, licencia A-IIA](https://www.simuladormtc.com/simulador-mtc-a2a)
- [A2B, licencia A-IIB](https://www.simuladormtc.com/simulador-mtc-a2b)
- [A3A, licencia A-IIIA](https://www.simuladormtc.com/simulador-mtc-a3a)
- [A3B, licencia A-IIIB](https://www.simuladormtc.com/simulador-mtc-a3b)
- [A3C, licencia A-IIIC](https://www.simuladormtc.com/simulador-mtc-a3c)
- [B2A, licencia B-IIA](https://www.simuladormtc.com/simulador-mtc-b2a)
- [B2B, licencia B-IIB](https://www.simuladormtc.com/simulador-mtc-b2b)
- [B2C, licencia B-IIC](https://www.simuladormtc.com/simulador-mtc-b2c)

## Preguntas completas por tema

- [Reglamento de tránsito y señales](https://www.simuladormtc.com/preguntas-reglamento-transito-mtc)
- [Obligaciones del conductor](https://www.simuladormtc.com/preguntas-obligaciones-conductor-mtc)
- [Regulación del transporte](https://www.simuladormtc.com/preguntas-regulacion-transporte-mtc)
- [Reglamento Nacional de Vehículos](https://www.simuladormtc.com/preguntas-reglamento-vehiculos-mtc)
- [Mercancías peligrosas](https://www.simuladormtc.com/preguntas-mercancias-peligrosas-mtc)
- [Sistema de licencias de conducir](https://www.simuladormtc.com/preguntas-licencias-conducir-mtc)
- [Conducción eficiente](https://www.simuladormtc.com/preguntas-conduccion-eficiente-mtc)
- [Mecánica para la conducción](https://www.simuladormtc.com/preguntas-mecanica-conduccion-mtc)
- [Inspección técnica vehicular](https://www.simuladormtc.com/preguntas-inspeccion-tecnica-vehicular-mtc)
- [SOAT y responsabilidad civil](https://www.simuladormtc.com/preguntas-soat-mtc)
- [Placa Única Nacional de Rodaje](https://www.simuladormtc.com/preguntas-placa-unica-mtc)
- [Primeros auxilios](https://www.simuladormtc.com/preguntas-primeros-auxilios-mtc)

## Fuentes

El contenido se contrasta con los balotarios y publicaciones del Ministerio de Transportes y Comunicaciones. La aplicación no pertenece al MTC ni lo representa.

- [Balotarios oficiales para el examen de conocimientos](https://www.gob.pe/institucion/mtc/informes-publicaciones/1928110-examen-de-conocimientos-para-postulantes-a-licencias-de-conducir)
- [Formato de 40 preguntas y 40 minutos](https://www.gob.pe/institucion/mtc/noticias/1100676-el-mtc-brinda-un-simulador-gratuito-para-practicar-el-examen-de-reglas-de-transito-para-obtener-el-brevete)

## Desarrollo

```bash
npm install
npm run dev
```

Verificaciones principales:

```bash
npm run check:question-fidelity
npm run check:practice-selection
npm run check:exam-submission
npm run check:seo-bank
npm run check:seo
npm run build
```
