import { describe, expect, test } from "vitest";
import { formatByteSize, utf8ByteLength } from "./format-byte-size";

describe("byte size formatting", () => {
  test("Given binary byte counts, when formatted, then exact bytes and readable KiB are not conflated", () => {
    expect(formatByteSize(900)).toBe("900 B");
    expect(formatByteSize(1536)).toBe("1,50 KiB");
  });

  test("Given an SVG with a multibyte character, when measured, then UTF-8 bytes are reported", () => {
    expect(utf8ByteLength("<svg>ä</svg>")).toBe(13);
  });
});
