const LOGO_URL =
  'https://res.cloudinary.com/da3lqh4dl/image/upload/v1788067549/Sharpable_Logo_Cropped_white_jx7igl.png'

// Real bounding-box ratio of the ink inside the source PNG (1920x650 canvas) — used so the
// masked `gold` variant (no intrinsic size of its own) sizes identically to the plain <img>.
const LOGO_RATIO = 1920 / 650

// The source asset is a white wordmark. The `gold` variant recolors it exactly (no filter/hue
// guessing) by using it as a mask on a `currentColor`-filled element instead of an <img> — pass
// a text-color class (e.g. `text-primary`) via className to control the color.
export default function Logo({ className = '', gold = false, alt = 'Sharpable' }) {
  if (gold) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`inline-block bg-current ${className}`}
        style={{
          aspectRatio: LOGO_RATIO,
          WebkitMaskImage: `url(${LOGO_URL})`,
          maskImage: `url(${LOGO_URL})`,
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

  return <img src={LOGO_URL} alt={alt} className={`w-auto ${className}`} />
}
