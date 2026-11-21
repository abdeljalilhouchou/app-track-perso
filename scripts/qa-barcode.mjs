import { writeFile } from "node:fs/promises";
import sharp from "sharp";

// EAN-13 digit patterns (7 modules each) and the first-digit parity that picks L or G codes.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** The 95 modules of an EAN-13 code, 1 for a bar. */
export function ean13Modules(code) {
  if (!/^\d{13}$/.test(code)) throw new Error(`EAN-13 needs 13 digits: ${code}`);
  const digits = [...code].map(Number);
  const check = (10 - (digits.slice(0, 12).reduce((sum, digit, index) => sum + digit * (index % 2 ? 3 : 1), 0) % 10)) % 10;
  if (check !== digits[12]) throw new Error(`Bad check digit for ${code}`);
  const left = digits.slice(1, 7).map((digit, index) => (PARITY[digits[0]][index] === "L" ? L : G)[digit]).join("");
  const right = digits.slice(7).map((digit) => R[digit]).join("");
  return `101${left}01010${right}101`;
}

/**
 * A Motion-JPEG file showing the barcode, for Edge's fake camera
 * (--use-file-for-fake-video-capture): the scanner then reads it like a real one.
 */
export async function writeBarcodeVideo(code, file) {
  const modules = ean13Modules(code);
  const unit = 5;
  const quiet = 14 * unit;
  const width = 640;
  const height = 480;
  const left = (width - modules.length * unit) / 2;
  const bars = [...modules].map((bit, index) => (bit === "1" ? `<rect x="${left + index * unit}" y="120" width="${unit}" height="240" fill="#000"/>` : "")).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/>${bars}</svg>`;
  if (left < quiet) throw new Error("Not enough quiet zone");
  const frame = await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
  // A few identical frames; Chromium loops the file.
  await writeFile(file, Buffer.concat(Array.from({ length: 10 }, () => frame)));
  return file;
}
