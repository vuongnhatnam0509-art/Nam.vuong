import { inflateRawSync } from "node:zlib";
import { parseBulkQueries } from "./bulk";

function readZip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 < buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString("utf8", nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buffer.length) break;
    const slice = buffer.subarray(dataStart, dataEnd);
    try {
      const content = method === 0 ? Buffer.from(slice) : method === 8 ? inflateRawSync(slice) : null;
      if (content) files.set(name, content);
    } catch {
      /* skip unreadable entry */
    }
    offset = dataEnd;
  }
  return files;
}

function xmlTexts(xml: string): string[] {
  return [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((match) => match[1]).filter(Boolean);
}

export function queriesFromXlsx(buffer: Buffer): string[] {
  const files = readZip(buffer);
  const chunks: string[] = [];
  for (const [name, content] of files) {
    if (!name.endsWith(".xml")) continue;
    chunks.push(xmlTexts(content.toString("utf8")).join("\n"));
  }
  return parseBulkQueries(chunks.join("\n"));
}
