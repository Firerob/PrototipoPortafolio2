'use client';

import { Text } from '@react-three/drei';

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
  return (
    <Text
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
