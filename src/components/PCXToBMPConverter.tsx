import React, { useState } from 'react';

const PCXToBMPConverter: React.FC = () => {
    const [quantizedRGBA, setQuantizedRGBA] = useState<Uint8ClampedArray | null>(null);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const data = new Uint8Array(arrayBuffer);
            const pcx = decodePCX(data);
            setWidth(pcx.width);
            setHeight(pcx.height);
            const quantResult = quantizeImage(pcx);
            drawImageToCanvas(pcx.width, pcx.height, pcx.imageData, 'originalCanvas');
            drawImageToCanvas(pcx.width, pcx.height, quantResult.quantizedRGBA, 'quantizedCanvas');

            setQuantizedRGBA(quantResult.quantizedRGBA);
            const bmpFile = createBMP(pcx.width, pcx.height, quantResult.quantizedIndices, quantResult.palette);
            const blob = new Blob([bmpFile], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        };
        reader.readAsArrayBuffer(file);
    };

    function decodePCX(data: Uint8Array) {
        const dv = new DataView(data.buffer);
        if (dv.getUint8(0) !== 0x0A) {
            throw "Это не PCX файл.";
        }
        const version = dv.getUint8(1);
        if (version !== 5) {
            throw "Неподдерживаемая версия PCX.";
        }
        const encoding = dv.getUint8(2);
        if (encoding !== 1) {
            throw "Неподдерживаемое кодирование PCX.";
        }
        const bitsPerPixel = dv.getUint8(3);
        if (bitsPerPixel !== 8) {
            throw "Ожидается 256-цветный (8 бит) PCX файл.";
        }
        const xMin = dv.getUint16(4, true);
        const yMin = dv.getUint16(6, true);
        const xMax = dv.getUint16(8, true);
        const yMax = dv.getUint16(10, true);
        const width = xMax - xMin + 1;
        const height = yMax - yMin + 1;
        const bytesPerLine = dv.getUint16(66, true);
        const numPlanes = dv.getUint8(65);
        if (numPlanes !== 1) {
            throw "Неподдерживаемое число плоскостей.";
        }
        const paletteOffset = data.length - 768;
        const palette = [];
        for (let i = 0; i < 256; i++) {
            const r = data[paletteOffset + i * 3];
            const g = data[paletteOffset + i * 3 + 1];
            const b = data[paletteOffset + i * 3 + 2];
            palette.push([r, g, b]);
        }
        const imageIndices = new Uint8Array(width * height);
        const imageData = new Uint8ClampedArray(width * height * 4);
        let offset = 128;
        for (let row = 0; row < height; row++) {
            let col = 0;
            while (col < bytesPerLine) {
                const byte = data[offset++];
                if ((byte & 0xC0) === 0xC0) {
                    const count = byte & 0x3F;
                    const value = data[offset++];
                    for (let i = 0; i < count; i++) {
                        if (col < width) {
                            imageIndices[row * width + col] = value;
                            const color = palette[value];
                            const pixelIndex = (row * width + col) * 4;
                            imageData[pixelIndex] = color[0];
                            imageData[pixelIndex + 1] = color[1];
                            imageData[pixelIndex + 2] = color[2];
                            imageData[pixelIndex + 3] = 255;
                        }
                        col++;
                    }
                } else {
                    if (col < width) {
                        imageIndices[row * width + col] = byte;
                        const color = palette[byte];
                        const pixelIndex = (row * width + col) * 4;
                        imageData[pixelIndex] = color[0];
                        imageData[pixelIndex + 1] = color[1];
                        imageData[pixelIndex + 2] = color[2];
                        imageData[pixelIndex + 3] = 255;
                    }
                    col++;
                }
            }
        }
        return { width: width, height: height, imageData: imageData, indices: imageIndices, palette: palette };
    }

    function drawImageToCanvas(width: number, height: number, imageData: Uint8ClampedArray, canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }
    const imgData = new ImageData(imageData, width, height);
    ctx.putImageData(imgData, 0, 0);

    }

    function quantizeImage(pcx: any) {
        const width = pcx.width, height = pcx.height;
        const indices = pcx.indices;
        const originalPalette = pcx.palette;
        const freq = new Array(256).fill(0);
        for (let i = 0; i < indices.length; i++) {
            freq[indices[i]]++;
        }
        const candidates = [];
        for (let i = 0; i < 256; i++) {
            if (freq[i] > 0) {
                candidates.push({ index: i, color: originalPalette[i], frequency: freq[i] });
            }
        }
        candidates.sort((a, b) => b.frequency - a.frequency);
        const newPalette = [];
        const selectedIndices = [];
        const THRESHOLD = 4000;
        for (const cand of candidates) {
            let tooSimilar = false;
            for (const sel of newPalette) {
                const delta = colorDelta(cand.color, sel);
                if (delta < THRESHOLD) {
                    tooSimilar = true;
                    break;
                }
            }
            if (!tooSimilar) {
                newPalette.push(cand.color);
                selectedIndices.push(cand.index);
            }
            if (newPalette.length >= 16) break;
        }
        if (newPalette.length < 16) {
            for (const cand of candidates) {
                const exists = newPalette.some(col => col[0] === cand.color[0] && col[1] === cand.color[1] && col[2] === cand.color[2]);
                if (!exists) {
                    newPalette.push(cand.color);
                    selectedIndices.push(cand.index);
                    if (newPalette.length >= 16) break;
                }
            }
        }
        while (newPalette.length < 16) {
            newPalette.push([0, 0, 0]);
        }
        const quantizedIndices = new Uint8Array(width * height);
        const quantizedRGBA = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < indices.length; i++) {
            const origColor = originalPalette[indices[i]];
            let bestIndex = 0;
            let bestDelta = Infinity;
            for (let j = 0; j < newPalette.length; j++) {
                const delta = colorDelta(origColor, newPalette[j]);
                if (delta < bestDelta) {
                    bestDelta = delta;
                    bestIndex = j;
                }
            }
            quantizedIndices[i] = bestIndex;
            const off = i * 4;
            quantizedRGBA[off] = newPalette[bestIndex][0];
            quantizedRGBA[off + 1] = newPalette[bestIndex][1];
            quantizedRGBA[off + 2] = newPalette[bestIndex][2];
            quantizedRGBA[off + 3] = 255;
        }
        return { quantizedIndices: quantizedIndices, quantizedRGBA: quantizedRGBA, palette: newPalette };
    }

    function colorDelta(c1: number[], c2: number[]) {
        const dr = c1[0] - c2[0];
        const dg = c1[1] - c2[1];
        const db = c1[2] - c2[2];
        return dr * dr + dg * dg + db * db;
    }

    function createBMP(width: number, height: number, quantizedIndices: Uint8Array, newPalette: number[][]) {
        const rowSize = Math.floor((4 * width + 31) / 32) * 4;
        const imageSize = rowSize * height;
        const fileSize = 54 + 64 + imageSize;
        const bmp = new Uint8Array(fileSize);
        const dv = new DataView(bmp.buffer);
        dv.setUint8(0, 0x42);
        dv.setUint8(1, 0x4D);
        dv.setUint32(2, fileSize, true);
        dv.setUint32(6, 0, true);
        dv.setUint32(10, 54 + 64, true);
        dv.setUint32(14, 40, true);
        dv.setInt32(18, width, true);
        dv.setInt32(22, height, true);
        dv.setUint16(26, 1, true);
        dv.setUint16(28, 4, true);
        dv.setUint32(30, 0, true);
        dv.setUint32(34, imageSize, true);
        dv.setInt32(38, 2835, true);
        dv.setInt32(42, 2835, true);
        dv.setUint32(46, 16, true);
        dv.setUint32(50, 0, true);
        for (let i = 0; i < 16; i++) {
            const color = newPalette[i] || [0, 0, 0];
            dv.setUint8(54 + i * 4, color[2]); // B
            dv.setUint8(54 + i * 4 + 1, color[1]); // G
            dv.setUint8(54 + i * 4 + 2, color[0]); // R
            dv.setUint8(54 + i * 4 + 3, 0); // Reserved
        }
        let offset = 54 + 64;
        for (let row = height - 1; row >= 0; row--) {
            const rowStart = row * width;
            for (let col = 0; col < width; col += 2) {
                const pixel1 = quantizedIndices[rowStart + col];
                const pixel2 = (col + 1 < width) ? quantizedIndices[rowStart + col + 1] : 0;
                const byte = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
                bmp[offset++] = byte;
            }
            while (offset % 4 !== 0) {
                bmp[offset++] = 0;
            }
        }
        return bmp;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Конвертер PCX (256 цветов) → BMP (16 цветов)</h1>
            <p className="mb-2">Выберите 256‑цветный PCX файл:</p>
            <input type="file" className="mb-4" accept=".pcx" onChange={handleFileChange} />
            <div className="mb-4">
                <h2 className="text-xl">Исходное изображение</h2>
                <canvas id="originalCanvas" className="border border-black"></canvas>
            </div>
            <div className="mb-4">
                <h2 className="text-xl">Изображение после конвертирования</h2>
                <canvas id="quantizedCanvas" className="border border-black"></canvas>
            </div>
            {downloadUrl && (
                <a href={downloadUrl} download="converted_image.bmp" className="bg-blue-500 text-white py-2 px-4 rounded">Скачать BMP файл</a>
            )}
        </div>
    );
};

export default PCXToBMPConverter;
