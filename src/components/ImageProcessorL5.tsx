import React, { useState } from 'react';
import FileInput from './FileInput';

const ImageProcessorL5: React.FC = () => {
    const [scale, setScale] = useState<number>(2);
    const [message, setMessage] = useState<string | null>(null);

    const handleFileChange = (file: File) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const buffer = e.target?.result as ArrayBuffer;
            const canvas = document.getElementById('resultCanvas') as HTMLCanvasElement;
            scaleBMP(canvas, buffer, scale);
        };
        reader.readAsArrayBuffer(file);
    };

    const scaleBMP = (canvas: HTMLCanvasElement, buffer: ArrayBuffer, k: number) => {
        const dataView = new DataView(buffer);
        
        // Check signature
        if (dataView.getUint16(0, true) !== 0x4D42) throw new Error('Invalid BMP');
        
        // Parse headers
        const pixelOffset = dataView.getUint32(10, true);
        const width = dataView.getInt32(18, true);
        const height = dataView.getInt32(22, true);
        const bpp = dataView.getUint16(28, true);
        const absHeight = Math.abs(height);
        
        // Check format: only 8-bit BMP supported
        if (bpp !== 8) throw new Error('Only 8-bit BMP supported');
        
        // Setup canvas dimensions with scaling factor
        canvas.width = Math.round(width * k);
        canvas.height = Math.round(absHeight * k);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        
        // Read palette
        const palette = new Array(256);
        for (let i = 0; i < 256; i++) {
            const offset = 54 + i * 4;
            palette[i] = {
                r: dataView.getUint8(offset + 2),
                g: dataView.getUint8(offset + 1),
                b: dataView.getUint8(offset)
            };
        }
        
        // Calculate original image parameters
        const rowSize = Math.floor((width * 8 + 31) / 32) * 4;
        const pixels = new Uint8Array(buffer, pixelOffset);
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        
        // Nearest neighbor scaling
        for (let y = 0; y < canvas.height; y++) {
            const srcY = Math.min(absHeight - 1, Math.floor(y / k));
            const origY = height > 0 ? absHeight - 1 - srcY : srcY;
            
            for (let x = 0; x < canvas.width; x++) {
                const srcX = Math.min(width - 1, Math.floor(x / k));
                const colorIndex = pixels[origY * rowSize + srcX];
                const color = palette[colorIndex] || {r: 0, g: 0, b: 0};
                
                const idx = (y * canvas.width + x) * 4;
                imageData.data[idx]     = color.r;
                imageData.data[idx + 1] = color.g;
                imageData.data[idx + 2] = color.b;
                imageData.data[idx + 3] = 255; // Alpha channel
            }
        }
        
        ctx.putImageData(imageData, 0, 0);

        // Create download link
        canvas.toBlob(function(blob) {
            if (!blob) {
                throw new Error('Could not create blob from canvas');
            }

            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'scaled.bmp';
            a.textContent = 'Download scaled BMP';
            document.body.appendChild(a);
        }, 'image/bmp');
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-antique-gold text-2xl font-bold mb-4">Scale BMP Image</h2>
            <FileInput onFileChange={handleFileChange} />
            <div className="mt-4">
                <label className="text-gray-300">Scale Factor (0.1 - 10):</label>
                <input 
                    type="number" 
                    min="0.1" 
                    max="10" 
                    step="0.1" 
                    value={scale} 
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="ml-2 p-1 bg-gray-700 text-white rounded"
                />
            </div>
            <canvas id="resultCanvas" className="mt-4"></canvas>
            {message && <p className="text-antique-gold mt-4">{message}</p>}
        </div>
    );
};

export default ImageProcessorL5;
