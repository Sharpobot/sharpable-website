const ICON_URL =
  'https://res.cloudinary.com/da3lqh4dl/image/upload/f_auto,q_auto/v1789094977/Sharpable_Icon_Logo_qmakpn.webp'
const ICON_MASK_URL =
  'https://res.cloudinary.com/da3lqh4dl/image/upload/e_trim,f_auto,q_auto/v1789096971/Sharpable_logo_icon_no_background_h4xh8a.webp'
const TITLE_URL =
  'https://res.cloudinary.com/da3lqh4dl/image/upload/e_trim,f_auto,q_auto/v1789094977/Sharpable_Title_Logo_z6tbdq.webp'

// Real dimensions: icon is a perfect square (500x500 source, already a self-contained circular
// badge — no e_trim needed); title logo trimmed to 1884x349; the transparent arrow-only cutout
// trimmed to 308x335 (all verified against Cloudinary's own e_trim output, same convention as
// before). The title lockup already bakes the icon's arrow shape into the wordmark's "a" — unlike
// the previous two-asset icon+wordmark combo, there's no separate icon to position alongside it for
// the default lockup.
const ICON_RATIO = 1
const ICON_MASK_RATIO = 308 / 335
const TITLE_RATIO = 1884 / 349

// `ICON_URL` (the solid-filled circle badge — opaque gold fill + opaque black arrow, transparent
// only in the square's corners outside the circle) isn't usable as a `mask-image` source: masks only
// read alpha, not color, so masking it renders a plain filled circle, not the arrow shape — a
// Cloudinary color-key strip attempt couldn't isolate the arrow either (make_transparent keys off
// corner color, and this asset's corners are already transparent, not gold). `ICON_MASK_URL` is a
// second, purpose-cut asset — just the arrow, transparent everywhere else — supplied specifically to
// fix this; use it for any masked/recolored icon use, `ICON_URL` only where the badge's own solid
// gold fill is wanted as-is (currently just the favicon).
function MaskedMark({ url, ratio, alt, className }) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={`inline-block bg-current ${className}`}
      style={{
        aspectRatio: ratio,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}

export default function Logo({ className = '', gold = false, mono = false, iconOnly = false, alt = 'Sharpable' }) {
  if (iconOnly) {
    if (mono) {
      return <MaskedMark url={ICON_MASK_URL} ratio={ICON_MASK_RATIO} alt={alt} className={className} />
    }
    return <img src={ICON_URL} alt={alt} className={`w-auto ${className}`} style={{ aspectRatio: ICON_RATIO }} />
  }

  if (gold) {
    return <MaskedMark url={TITLE_URL} ratio={TITLE_RATIO} alt={alt} className={className} />
  }

  // Default: the title lockup already reads as a complete wordmark+mark unit on its own (the arrow
  // is baked into the "a"), so there's no separate icon to combine it with like the old two-asset
  // combo used to need.
  return <img src={TITLE_URL} alt={alt} className={`w-auto ${className}`} style={{ aspectRatio: TITLE_RATIO }} />
}
