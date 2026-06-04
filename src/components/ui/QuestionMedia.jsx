import { cn } from '../../utils/cn.js';

export function normalizeImageSource(source, mediaType = 'image/png') {
  if (!source || typeof source !== 'string') return null;
  const cleanSource = source.trim();
  if (!cleanSource) return null;
  if (/^(data:|https?:\/\/|\/)/i.test(cleanSource)) return cleanSource;
  return `data:${mediaType || 'image/png'};base64,${cleanSource}`;
}

export function QuestionImage({ src, mediaType = 'image/png', alt = 'Imagen de la pregunta', className = '', imgClassName = '' }) {
  const imageSrc = normalizeImageSource(src, mediaType);
  if (!imageSrc) return null;

  return (
    <div className={cn('grid min-h-[180px] place-items-center overflow-hidden rounded-lg border border-line bg-slate-50 p-3', className)}>
      <img
        src={imageSrc}
        alt={alt}
        className={cn('max-h-full max-w-full object-contain', imgClassName)}
        loading="lazy"
      />
    </div>
  );
}

export function OptionContent({ option, className = '' }) {
  const imageSrc = normalizeImageSource(option?.mediaData, option?.mediaType);
  const text = option?.texto?.trim();

  return (
    <span className={cn('flex min-w-0 flex-1 flex-col gap-3 font-medium', className)}>
      {text ? <span className="leading-snug">{text}</span> : null}
      {imageSrc ? (
        <span className="inline-flex max-w-full rounded-lg border border-line bg-white p-2">
          <img src={imageSrc} alt={text || 'Opcion con imagen'} className="max-h-28 max-w-full object-contain" loading="lazy" />
        </span>
      ) : null}
    </span>
  );
}
