# Production asset generation prompts

October 25, 2026. Built-in image generation, using `landing-dark-lime-concept.png` as a style reference. These are text-free raster art assets for Studio to integrate, not application screenshots or code. Asset completion and file metadata are recorded in `assets/manifest.json` after inspection.

## hero-atmosphere-v1

Transparent background requested: false.

```text
Use case: stylized-concept. Asset type: PRODUCTION WEBSITE BACKGROUND PLATE, not a UI mockup. Image 1 is STYLE AND MATERIAL REFERENCE ONLY: match its near-black forest graphite, atmospheric smoky olive light and rough rock photography. Generate a wide 16:9 landscape background at high resolution. It will sit behind a live website hero with heading on the LEFT and a separate transparent torus object on the RIGHT. Do NOT include the torus: it will be composited separately. Keep the left 55% nearly empty, extremely dark charcoal #0B100E with only subtle natural texture, ideal for white text overlay. On the right, cinematic soft directional sage/lime light through thin mist, deep dimensional void centered around x75% y45%, a small jagged floating graphite rock near x59% y80%, and a faint rocky edge at the extreme far right, kept away from central subject space. Dark foreground fragments confined to bottom 15%; top and left edges dissolve naturally into near-black. Premium tactile physically rendered environment, restrained film grain, realistic rock material, no neon wall, no bright flat gradients. Atmosphere like the original reference, not outer space. ABSOLUTELY NO letters, numbers, text, symbols, UI, logos, buttons, circles, rings, charts, watermarks or fake screenshots. The central right area remains empty to receive the independent ring asset. Render background only.
```

## torus-cutout-v1

Transparent background requested: true.

```text
Use case: stylized-concept. Asset type: PRODUCTION TRANSPARENT HERO OBJECT, square 1:1. Image 1 is STYLE AND SUBJECT REFERENCE, not a page to reproduce. Generate ONLY the dominant thick graphite torus with the luminous translucent acidic-lime segment seen in its upper hero, on a genuinely transparent alpha background. Remove every webpage element. One substantial circular doughnut-shaped object, nearly front facing with subtle 10-degree perspective, centered, full object visible with 10% transparent padding. Dark gunmetal graphite surface with photorealistic fine pitted/stone-like texture, beveled edges, deep thickness and clear inner sidewall. Upper-left approximately two-fifths of circumference is translucent lime #D2FA69 polished material with subtle luminous depth and physically credible highlights. Rest is dark graphite with directional top-left highlights and soft self-shadowing. Thick tubular cross-section, not a flat flat pie chart, not a thin SVG ring. Inner opening is genuinely transparent, large and centered so real DOM numbers can be placed in it. Center inner opening roughly x50%, y50%, diameter about 34% of image width. Preserve premium tactile graphite and translucent lime appearance from reference. No orbits, particles, rocks, floor, background, smoke, contact-ground shadow, letters, numbers, text, labels, logos, gauges, icons, watermark or UI. Background AND central hole must have real alpha transparency. Asset only; not a mockup.
```

## outcomes-atmosphere-v1

Transparent background requested: false.

```text
Use case: stylized-concept. Asset type: PRODUCTION WEBSITE SECTION BACKGROUND, landscape 16:9. Image 1 is STYLE REFERENCE: match the dark rocky misty landscape in its lower 'two clear outcomes' section, but remove ALL text, UI, diagrams, rings and symbols. Create a cinematic shallow graphite rock valley with rough dark stone outcrops framing the lower left and lower right corners, low fog drifting along the bottom, softly backlit dusty sage atmosphere, near-black forest #0B100E palette with very subtle olive light. Keep upper 70% and central middle spacious, low-contrast and free of solid objects for white heading on left and an HTML/SVG branching flow on right. Rocks occupy lower 20-30% with irregular silhouettes and sharp physically realistic material, no giant mountains or distracting vista. Top edge must fade to near black for seamless transition from preceding web section. The glowing outcome nodes and connecting paths will be drawn separately in code: include NONE here. Refined photographic/3D texture, no purple/blue, no fantasy castle, no stars, no humans, no buildings, no coins. Absolutely NO text, letters, numbers, icons, diagrams, charts, logos, watermark or website UI. Background environment plate only.
```
