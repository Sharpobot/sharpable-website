export default function WorkPreview({ image, alt }) {
  return (
    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-divider shadow-xl shadow-primary/15">
      <img src={image} alt={alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
    </div>
  )
}
