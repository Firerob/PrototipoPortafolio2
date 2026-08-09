'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { archiveScroll, CAMERA_RANGE, phaseOf, smootherstep } from '@/lib/archiveScroll';

/*
  The giant word sits INSIDE the canvas, not behind it as HTML.

  Tempting as an HTML layer is (crisper type, real IBM Plex, zero GPU cost),
  it would then render behind the whole canvas — including the grid. The brief
  puts the word in front of the grid and behind the prism, which only works if
  it shares the depth buffer. It also means the transmission material actually
  refracts the letterforms, which is most of the effect.

  It carries no accessible name of its own: the canvas has an aria-label and
  the real <h1> lives in the DOM overlay, so announcing it here would just
  duplicate the heading.
*/
export default function BackdropWord({
  word = 'WORKS',
  /*
    Troika fetches its default typeface (Roboto) from the Google CDN on first
    paint. To keep the page self-hosted AND on-brand, drop
    IBMPlexSans-Bold.woff into /public/fonts/ and pass it here:
      <BackdropWord font="/fonts/IBMPlexSans-Bold.woff" />
    Left undefined the component still renders — just in Troika's default face.
  */
  font,
}) {
  const ref = useRef(null);

  /*
    Fade out on the archive dive.

    The word is a pale tint chosen to sit faintly on a near-black background.
    Once the wave flips the page to light it inverts into a large dark smear
    across the middle of the corridor, so it leaves with the rest of the hero.
  */
  useFrame(() => {
    if (!ref.current) return;
    const dive = smootherstep(phaseOf(archiveScroll.progress, CAMERA_RANGE));
    ref.current.fillOpacity = 0.075 * (1 - dive);
  });

  return (
    <Text
      ref={ref}
      font={font}
      position={[0, 0.15, -4]}
      fontSize={3.4}
      letterSpacing={-0.045}
      anchorX="center"
      anchorY="middle"
      color="#c9d2ff"
      fillOpacity={0.075}
      // Behind everything else in the transparent pass; without depthWrite off
      // it punches a hole in the grid glow drawn after it.
      renderOrder={-1}
      material-toneMapped={false}
      material-depthWrite={false}
      material-transparent
    >
      {word}
    </Text>
  );
}
