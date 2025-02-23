import React, { useState } from 'react';
import FileInput from './FileInput';

const ImageProcessorL6: React.FC = () => {
    const [transparency, setTransparency] = useState<number>(0.5);
    const [mainFile, setMainFile] = useState<ArrayBuffer | null>(null);
    const [logoFile, setLogoFile] = useState<ArrayBuffer | null>(null);

    const handleMainFileChange = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setMainFile(e.target?.result as ArrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleLogoFileChange = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setLogoFile(e.target?.result as ArrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    };

    const parseBMP = (buffer: ArrayBuffer) => {
        const dataView = new DataView(buffer);
        if (dataView.getUint16(0, true) !== 0x4D42) {
            throw new Error("Invalid BMP file");
        }

        const pixelOffset = dataView.getUint32(10, true);
        const width = dataView.getInt32(18, true);
        const height = dataView.getInt32(22, true);
        const bpp = dataView.getUint16(28, true);

        if (bpp !== 24) {
            throw new Error("Only 24-bit BMP supported");
        }

        const rowSize = Math.floor((width * 24 + 31) / 32) * 4;
        const pixelData = new Uint8Array(buffer, pixelOffset);

        return {
            width,
            height: Math.abs(height),
            pixelOffset,
            bpp,
            rowSize,
            data: pixelData,
            isBottomUp: height > 0,
            getPixel: function(x: number, y: number) {
                const row = this.isBottomUp ? (this.height - 1 - y) : y;
                const offset = row * this.rowSize + x * 3;
                return {
                    r: this.data[offset + 2],
                    g: this.data[offset + 1],
                    b: this.data[offset]
                };
            }
        };
    };

    const handleProcess = () => {
        if (mainFile && logoFile) {
            const canvas = document.getElementById('resultCanvas') as HTMLCanvasElement;
            overlayLogo(mainFile, logoFile, transparency, canvas);
        }
    };

    const overlayLogo = (mainBuffer: ArrayBuffer, logoBuffer: ArrayBuffer, k: number, canvas: HTMLCanvasElement) => {
        const mainBMP = parseBMP(mainBuffer);
        const logoBMP = parseBMP(logoBuffer);

        canvas.width = mainBMP.width;
        canvas.height = mainBMP.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const imageData = ctx.createImageData(mainBMP.width, mainBMP.height);

        // Copy main image pixels
        for (let y = 0; y < mainBMP.height; y++) {
            for (let x = 0; x < mainBMP.width; x++) {
                const pixel = mainBMP.getPixel(x, y);
                const idx = (y * mainBMP.width + x) * 4;
                imageData.data[idx] = pixel.r;
                imageData.data[idx + 1] = pixel.g;
                imageData.data[idx + 2] = pixel.b;
                imageData.data[idx + 3] = 255;
            }
        }

        const offsetX = Math.floor((mainBMP.width - logoBMP.width) / 2);
        const offsetY = Math.floor((mainBMP.height - logoBMP.height) / 2);
        const logoBg = logoBMP.getPixel(0, 0);

        // Overlay logo
        for (let ly = 0; ly < logoBMP.height; ly++) {
            for (let lx = 0; lx < logoBMP.width; lx++) {
                const mainX = offsetX + lx;
                const mainY = offsetY + ly;

                if (mainX < 0 || mainX >= mainBMP.width || mainY < 0 || mainY >= mainBMP.height) {
                    continue;
                }

                const logoPixel = logoBMP.getPixel(lx, ly);
                if (logoPixel.r === logoBg.r && logoPixel.g === logoBg.g && logoPixel.b === logoBg.b) {
                    continue;
                }

                const idx = (mainY * mainBMP.width + mainX) * 4;
                const mainR = imageData.data[idx];
                const mainG = imageData.data[idx + 1];
                const mainB = imageData.data[idx + 2];

                const newR = Math.round(mainR * k + logoPixel.r * (1 - k));
                const newG = Math.round(mainG * k + logoPixel.g * (1 - k));
                const newB = Math.round(mainB * k + logoPixel.b * (1 - k));

                imageData.data[idx] = newR;
                imageData.data[idx + 1] = newG;
                imageData.data[idx + 2] = newB;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Create download link
        canvas.toBlob((blob) => {
            if (!blob) throw new Error('Could not create blob from canvas');
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'logo_overlay.bmp';
            a.textContent = 'Download Result BMP';
            document.body.appendChild(a);
        }, 'image/bmp');
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-antique-gold text-2xl font-bold mb-4">Logo Overlay</h2>
            
            <div className="mb-4">
                <label className="text-gray-300">Main BMP File (24-bit):</label>
                <FileInput onFileChange={handleMainFileChange} />
            </div>

            <div className="mb-4">
                <label className="text-gray-300">Logo BMP File (24-bit):</label>
                <FileInput onFileChange={handleLogoFileChange} />
            </div>

            <div className="mb-4">
                <label className="text-gray-300">Transparency (0.1 - 0.9):</label>
                <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={transparency}
                    onChange={(e) => setTransparency(Number(e.target.value))}
                    className="ml-2"
                />
                <span className="text-gray-300 ml-2">{transparency.toFixed(1)}</span>
            </div>

            <button
                onClick={handleProcess}
                className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
            >
                Process
            </button>

            <canvas id="resultCanvas" className="mt-4"></canvas>
        </div>
    );
};

export default ImageProcessorL6;
