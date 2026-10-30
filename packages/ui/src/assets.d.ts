// Asset imports resolved by the bundler (Vite): an SVG becomes its URL, a CSS file is injected.
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module '*.css';
