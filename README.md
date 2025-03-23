# Copper Bars Demo

![Demo Screenshot](./assets/screenshots/demo-screenshot.png)

A retro Amiga-style demo with visual effects synchronized to classic Amiga music tracks. This demo features copper bars, starfield, and CRT effects that react to audio frequencies.

## Features

- **Authentic Retro Visuals**: Recreates the iconic "copper bars" effect popularized on the Commodore Amiga
- **Audio Reactive Visuals**: All visual elements respond to music frequencies
- **Starfield Background**: Dynamic star movement with audio reactivity
- **CRT Effect**: Authentic CRT screen simulation with scanlines, noise, and curvature
- **Music Player**: Built-in music player with classic Amiga mod tracks
- **Transport Controls**: Play/pause, track navigation, and volume controls
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

### Controls

- **Space**: Toggle Play/Pause
- **N / P**: Next/Previous track
- **Shift + Up/Down**: Adjust volume
- **C**: Toggle CRT effect
- **M**: Show music selection panel
- **H**: Display help instructions
- **Click center**: Toggle CRT effect
- **Click any corner**: Change visualization parameters

### Running Locally

1. Clone this repository
2. Place your music tracks in the `tracks` folder
3. Update the `tracks.json` file with your track information
4. Open `index.html` in a modern web browser

## Technical Details

The demo is built with:

- Vanilla JavaScript with TypeScript for type safety
- HTML5 Canvas for rendering
- WebGL for CRT effects (with Canvas fallback)
- Web Audio API for audio analysis and visualization

### Project Structure

- `src/components/` - Core components like Visualizer, AudioSystem, etc.
- `src/main.ts` - Main application entry point
- `tracks.json` - Music tracks configuration
- `assets/` - Images and other static assets

## Browser Compatibility

Works best in Chrome, Edge, and Safari. Firefox users may experience reduced performance with the CRT effect (automatically disabled in Firefox).

## Credits

- Music: Various Amiga artists (see tracks.json)
- Font: "Press Start 2P" by CodeMan38

## License

MIT License - See LICENSE file for details
