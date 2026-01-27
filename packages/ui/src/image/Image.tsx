import NextImage, { ImageProps } from "next/image";

import { IMAGES_BASE_PATH } from "@repo/constants/src/constants";

export default function Image({ src, ...props }: ImageProps) {
  const srcString = src.toString();
  
  // If src already starts with /, use it as-is
  // Otherwise, prepend IMAGES_BASE_PATH
  const url = srcString.startsWith("/") 
    ? src 
    : `${IMAGES_BASE_PATH}${srcString}`;

  return <NextImage src={url} {...props} />;
}
