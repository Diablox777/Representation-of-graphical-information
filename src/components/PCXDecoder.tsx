import React, { useState } from 'react';

const PCXDecoder: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const canvas = decodePCX(buffer);
        setImageUrl(canvas.toDataURL());
      } catch (err) {
        console.error(err);
        alert("Ошибка: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const decodePCX = (buffer: ArrayBuffer): HTMLCanvasElement => {
    const dataView = new DataView(buffer);
    
    // Read PCX header
    const id = dataView.getUint8(0);
    if (id !== 0x0A) {
      throw new Error("Неверный идентификатор PCX (ожидается 0x0A)");
    }

    const coding = dataView.getUint8(2);
    if (coding !== 1) {
      throw new Error("Неподдерживаемый метод кодирования (не RLE)");
    }

    const bitsPerPixel = dataView.getUint8(3);
    const planes = dataView.getUint8(65);
    if (bitsPerPixel !== 8 || planes !== 1) {
      throw new Error("Поддерживаются только 8-битные, 1-плановые PCX файлы");
    }

    const xMin = dataView.getUint16(4, true);
    const yMin = dataView.getUint16(6, true);
    const xMax = dataView.getUint16(8, true);
    const yMax = dataView.getUint16(10, true);
    const width = xMax - xMin + 1;
    const height = yMax - yMin + 1;
    const bytesPerLine = dataView.getUint16(66, true);

    // Decode RLE compressed data
    const imageSize = height * bytesPerLine;
    let decoded = new Uint8Array(imageSize);
    let pos = 0;
    let dataOffset = 128;

    while (pos < imageSize && dataOffset < buffer.byteLength) {
      let byte = dataView.getUint8(dataOffset++);
      let count, value;
      if ((byte & 0xC0) === 0xC0) {
        count = byte & 0x3F;
        value = dataView.getUint8(dataOffset++);
      } else {
        count = 1;
        value = byte;
      }
      for (let i = 0; i < count && pos < imageSize; i++) {
        decoded[pos++] = value;
      }
    }

    // Extract palette
    if (buffer.byteLength < 769 + 128) {
      throw new Error("Файл слишком маленький для палитры");
    }
    const paletteMarker = dataView.getUint8(buffer.byteLength - 769);
    if (paletteMarker !== 0x0C) {
      throw new Error("Отсутствует маркер палитры (ожидается 0x0C)");
    }
    let palette = new Uint8Array(256 * 3);
    let paletteStart = buffer.byteLength - 768;
    for (let i = 0; i < 256 * 3; i++) {
      palette[i] = dataView.getUint8(paletteStart + i);
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Не удалось получить контекст canvas");

    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let idx = y * bytesPerLine + x;
        let colorIndex = decoded[idx];
        let r = palette[colorIndex * 3];
        let g = palette[colorIndex * 3 + 1];
        let b = palette[colorIndex * 3 + 2];
        let pixelIndex = (y * width + x) * 4;
        imgData.data[pixelIndex] = r;
        imgData.data[pixelIndex + 1] = g;
        imgData.data[pixelIndex + 2] = b;
        imgData.data[pixelIndex + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
      <h1 className="text-antique-gold text-2xl font-bold mb-4">
        Декодирование и вывод PCX файла
      </h1>
      
      <input
        type="file"
        id="pcxFile"
        accept=".pcx"
        onChange={handleFileChange}
        className="mb-4 text-white"
      />

      {imageUrl && (
        <img 
          src={imageUrl} 
          alt="Decoded PCX" 
          className="border border-gray-700 rounded"
        />
      )}
    </div>
  );
};

export default PCXDecoder;
