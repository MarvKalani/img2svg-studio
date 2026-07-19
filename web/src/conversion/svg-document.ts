import { ConversionFailure, ConversionFailureCode } from "./conversion-failure";

export interface SvgMetrics {
  heightPixels: number;
  pathCount: number;
  widthPixels: number;
}

export function parseSvgDocument(svg: string): Element {
  const parsedDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsedDocument.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new ConversionFailure(ConversionFailureCode.InvalidSvg);
  }
  return document.importNode(root, true);
}

export function readSvgMetrics(svg: Element): SvgMetrics {
  const widthPixels = Number(svg.getAttribute("width"));
  const heightPixels = Number(svg.getAttribute("height"));
  if (!Number.isInteger(widthPixels) || !Number.isInteger(heightPixels)) {
    throw new ConversionFailure(ConversionFailureCode.InvalidSvg);
  }

  return {
    heightPixels,
    pathCount: svg.querySelectorAll("path").length,
    widthPixels,
  };
}
