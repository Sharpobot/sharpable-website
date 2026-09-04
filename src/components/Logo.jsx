const ICON_URL =
  'https://res.cloudinary.com/da3lqh4dl/image/upload/e_trim,f_auto,q_auto/v1788265233/Sharpable_Custom_Graphic_V1_i6ku3u.png'
const WORDMARK_URL =
  'https://res.cloudinary.com/da3lqh4dl/image/upload/e_trim,f_auto,q_auto/v1788265176/Sharpable_Logo_V2_Cropped_No_Shadow_wtb6hj.png'

// Real bounding-box ratios of the ink inside each trimmed source PNG (verified via canvas pixel
// scan, then confirmed against Cloudinary's own e_trim output dimensions: 888x988 / 1831x356) —
// used so the icon keeps its true proportions and the masked `gold` wordmark (no intrinsic size
// of its own) sizes identically to the plain <img>.
const ICON_RATIO = 888 / 988
const WORDMARK_RATIO = 1831 / 356

// Both source assets are already gold in the art itself (no white variant exists anymore), so any
// other color needs the same mask-on-currentColor trick: `gold` uses it on the wordmark (the
// Footer's big accent heading, which must match the site's exact `text-primary` token rather than
// the asset's own slightly-different gold), and `mono` uses it on the icon (the mobile Editorial
// Index menu's background watermark, recolored to a barely-there stone grey via the consumer's own
// `text-*` className rather than staying gold — gold at low opacity still reads as a brand color;
// a neutral tone at low opacity reads as texture/emboss instead, which is the point of a watermark).
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

export default function Logo({ className = '', gold = false, mono = false, iconOnly = false, wordmarkOnly = false, alt = 'Sharpable' }) {
  if (gold) {
    return <MaskedMark url={WORDMARK_URL} ratio={WORDMARK_RATIO} alt={alt} className={className} />
  }

  if (iconOnly) {
    if (mono) {
      return <MaskedMark url={ICON_URL} ratio={ICON_RATIO} alt={alt} className={className} />
    }
    return <img src={ICON_URL} alt={alt} className={`w-auto ${className}`} style={{ aspectRatio: ICON_RATIO }} />
  }

  if (wordmarkOnly) {
    return <img src={WORDMARK_URL} alt={alt} className={`w-auto ${className}`} />
  }

  // Default: the graphic mark + wordmark side by side, sized off the container's own height so a
  // single `h-*` className on the wrapper controls the whole lockup at once. The icon-to-wordmark
  // proportions here aren't guessed — they're measured pixel-for-pixel off the official OG banner
  // (Sharpable_OG_Thumbnail_V1), which is the reference lockup: icon 125x140 vs wordmark 791x153 in
  // that asset, so the icon sits at ~92% of the wordmark's height (not equal height, which read as
  // the icon overpowering the wordmark), a ~4px gap at navbar scale (proportional to the banner's
  // 16px gap at its much larger size — the old gap-2/8px read as way too loose by comparison), and
  // nudged up slightly (translateY, a percentage of the icon's own box per the CSS transform spec,
  // not of the row height) since the banner's icon sits above the wordmark's own vertical center,
  // not centered on it — the wordmark's descenders (the "p" tail) pull its own bbox center down.
  return (
    <span role="img" aria-label={alt} className={`inline-flex items-center gap-1 ${className}`}>
      <img
        src={ICON_URL}
        alt=""
        className="w-auto"
        style={{ aspectRatio: ICON_RATIO, height: '92%', transform: 'translateY(-15%)' }}
      />
      <img src={WORDMARK_URL} alt="" className="h-full w-auto" />
    </span>
  )
}
