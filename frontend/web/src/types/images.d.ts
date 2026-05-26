/**
 * 静的ファイルインポートの型宣言
 *
 * next-env.d.ts は .gitignore で管理されているため CI 環境に存在しない。
 * next/image-types/global が提供する宣言をここで補完する。
 */

declare module "*.svg" {
  import type { StaticImageData } from "next/image";
  const content: StaticImageData;
  export default content;
}

declare module "*.png" {
  import type { StaticImageData } from "next/image";
  const content: StaticImageData;
  export default content;
}

declare module "*.jpg" {
  import type { StaticImageData } from "next/image";
  const content: StaticImageData;
  export default content;
}

declare module "*.jpeg" {
  import type { StaticImageData } from "next/image";
  const content: StaticImageData;
  export default content;
}

declare module "*.webp" {
  import type { StaticImageData } from "next/image";
  const content: StaticImageData;
  export default content;
}

declare module "*.gif" {
  import type { StaticImageData } from "next/image";
  const content: StaticImageData;
  export default content;
}
