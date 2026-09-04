export default function WorkPreview({ image, alt }) {
  const srcSet = [400, 800, 1200]
    .map((w) => `${image.replace('w=1200', `w=${w}`)} ${w}w`)
    .join(', ')

  return (
    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-divider shadow-xl shadow-primary/15">
      <img
        src={image}
        srcSet={srcSet}
        sizes="(min-width: 1024px) 50vw, 100vw"
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
    </div>
  )
}
