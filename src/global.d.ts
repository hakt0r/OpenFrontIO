declare module "*.png" {
  const content: string;
  export default content;
}
declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}
declare module "*.svg" {
  const content: string;
  export default content;
}
declare module "*.bin" {
  const content: string;
  export default content;
}
declare module "*.md" {
  const content: string;
  export default content;
}
declare module "*.txt" {
  const content: string;
  export default content;
}
declare module "*.html" {
  const content: string;
  export default content;
}
declare module "*.xml" {
  const content: string;
  export default content;
}

declare const isElectron: () => boolean;

declare global {
  interface Window {
    ramp?: {
      que: (() => void)[];
      passiveMode?: boolean;
      spaAddAds?: (ads: { type: string; selectorId: string }[]) => void;
      destroyUnits?: (units: string) => void;
    };
  }
}
