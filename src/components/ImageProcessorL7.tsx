import React, { useState } from 'react';
import FileInput from './FileInput';

const ImageProcessorL7: React.FC = () => {
    const [containerFile, setContainerFile] = useState<ArrayBuffer | null>(null);
    const [textFile, setTextFile] = useState<ArrayBuffer | null>(null);
    const [mode, setMode] = useState<string>('25');
    const [extractedText, setExtractedText] = useState<string>('');
    const [stegoFile, setStegoFile] = useState<ArrayBuffer | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
    const [stegoImageUrl, setStegoImageUrl] = useState<string>('');


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
        const absHeight = Math.abs(height);

        return {
            width,
            height: absHeight,
            pixelOffset,
            bpp,
            rowSize,
            buffer,
            isBottomUp: height > 0,
            data: new Uint8Array(buffer, pixelOffset),
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

    const stringToUint8Array = (str: string) => {
        return new TextEncoder().encode(str);
    };

    const uint8ArrayToString = (arr: Uint8Array) => {
        // Filter out null bytes and invalid UTF-8 sequences
        const validBytes = arr.filter(byte => byte !== 0);
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(validBytes));
        } catch (e) {
            console.error('Text decoding error:', e);
            return 'Extracted data contains invalid UTF-8 sequences';
        }
    };


    const embedPayload = (containerData: Uint8Array, payload: Uint8Array, bitsCount: number) => {
        const payloadBits: number[] = [];
        for (let i = 0; i < payload.length; i++) {
            for (let bit = 7; bit >= 0; bit--) {
                payloadBits.push((payload[i] >> bit) & 1);
            }
        }

        const capacityBits = containerData.length * bitsCount;
        if (payloadBits.length > capacityBits) {
            throw new Error("Not enough space in image for embedding");
        }

        const stego = new Uint8Array(containerData);
        let bitIndex = 0;

        for (let i = 0; i < stego.length && bitIndex < payloadBits.length; i++) {
            let newVal = stego[i] & (~((1 << bitsCount) - 1));
            let embedVal = 0;
            for (let j = 0; j < bitsCount; j++) {
                embedVal = (embedVal << 1) | ((bitIndex < payloadBits.length) ? payloadBits[bitIndex] : 0);
                bitIndex++;
            }
            newVal |= embedVal;
            stego[i] = newVal;
        }

        return stego;
    };

    const extractPayload = (containerData: Uint8Array, bitsCount: number, dataLengthBits: number) => {
        const extractedBits: number[] = [];
        for (let i = 0; i < containerData.length && extractedBits.length < dataLengthBits; i++) {
            let val = containerData[i] & ((1 << bitsCount) - 1);
            for (let j = bitsCount - 1; j >= 0 && extractedBits.length < dataLengthBits; j--) {
                extractedBits.push((val >> j) & 1);
            }
        }

        const result = new Uint8Array(Math.ceil(extractedBits.length / 8));
        for (let i = 0; i < result.length; i++) {
            let byteVal = 0;
            for (let bit = 0; bit < 8; bit++) {
                const index = i * 8 + bit;
                byteVal = (byteVal << 1) | (index < extractedBits.length ? extractedBits[index] : 0);
            }
            result[i] = byteVal;
        }

        return result;
    };

    const handleEmbed = () => {
        try {
            if (!containerFile || !textFile) {
                throw new Error("Both container and text files must be selected");
            }

            const bitsCount = mode === "25" ? 2 : mode === "50" ? 4 : 6;
            const bmp = parseBMP(containerFile);
            const containerData = new Uint8Array(containerFile, bmp.pixelOffset, bmp.rowSize * bmp.height);

            const capacityBytes = Math.floor((containerData.length * bitsCount) / 8);
            const headerSize = 4;
            if (textFile.byteLength > capacityBytes - headerSize) {
                throw new Error("Text file is too large for selected mode");
            }

            const header = new Uint8Array(4);
            const dv = new DataView(header.buffer);
            dv.setUint32(0, textFile.byteLength, true);

            const payload = new Uint8Array(header.length + textFile.byteLength);
            payload.set(header, 0);
            payload.set(new Uint8Array(textFile), header.length);

            const stegoData = embedPayload(containerData, payload, bitsCount);
            const stegoBuffer = containerFile.slice(0);
            const stegoFull = new Uint8Array(stegoBuffer);
            stegoFull.set(stegoData, bmp.pixelOffset);

            setStegoFile(stegoBuffer);
            
            // Create download link
            const blob = new Blob([stegoBuffer], { type: 'image/bmp' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stego_image.bmp';
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            
            alert("Embedding completed successfully! The stego image has been downloaded.");

        } catch (err) {
            if (err instanceof Error) {
                alert(`Error: ${err.message}`);
                console.error(err);
            } else {
                alert('An unknown error occurred');
                console.error(err);
            }
        }
    };

    const handleExtract = () => {
        try {
            if (!stegoFile) {
                throw new Error("Stego file must be selected");
            }

            const bitsCount = mode === "25" ? 2 : mode === "50" ? 4 : 6;
            const bmp = parseBMP(stegoFile);
            const containerData = new Uint8Array(stegoFile, bmp.pixelOffset, bmp.rowSize * bmp.height);

            const headerBits = 32;
            const headerBytes = extractPayload(containerData, bitsCount, headerBits);
            const headerDV = new DataView(headerBytes.buffer);
            const textLength = headerDV.getUint32(0, true);

            const headerContainerBytes = Math.ceil(32 / bitsCount);
            const dataSlice = containerData.slice(headerContainerBytes);
            const extracted = extractPayload(dataSlice, bitsCount, textLength * 8);
            
            // Validate extracted data
            if (extracted.length !== textLength) {
                throw new Error(`Extracted data length mismatch: expected ${textLength} bytes, got ${extracted.length}`);
            }

            const extractedText = uint8ArrayToString(extracted);
            setExtractedText(extractedText);

            alert(`Extraction completed. Extracted text has ${textLength} bytes.`);
        } catch (err) {
            if (err instanceof Error) {
                alert(`Error: ${err.message}`);
                console.error(err);
            } else {
                alert('An unknown error occurred');
                console.error(err);
            }
        }
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-antique-gold text-2xl font-bold mb-4">BMP Steganography</h2>

            <div className="mb-4">
                <label className="text-gray-300">Container BMP File (24-bit):</label>
                <FileInput onFileChange={(file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setContainerFile(e.target?.result as ArrayBuffer);
                    setOriginalImageUrl(URL.createObjectURL(file));
                };
                reader.readAsArrayBuffer(file);

                }} />
            </div>

            <div className="mb-4">
                <label className="text-gray-300">Text File:</label>
                <FileInput onFileChange={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => setTextFile(e.target?.result as ArrayBuffer);
                    reader.readAsArrayBuffer(file);
                }} />
            </div>

            <div className="mb-4">
                <label className="text-gray-300">Mode:</label>
                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="ml-2 bg-gray-700 text-white rounded p-1"
                >
                    <option value="25">25% (2 bits)</option>
                    <option value="50">50% (4 bits)</option>
                    <option value="75">75% (6 bits)</option>
                </select>
            </div>

            <button
                onClick={handleEmbed}
                className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md mr-2 hover:bg-gray-800 transition-colors"
            >
                Embed Text
            </button>

            <div className="mt-4">
                <label className="text-gray-300">Stego BMP File:</label>
                <FileInput onFileChange={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => setStegoFile(e.target?.result as ArrayBuffer);
                    reader.readAsArrayBuffer(file);
                }} />
            </div>

            <button
                onClick={handleExtract}
                className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md mt-2 hover:bg-gray-800 transition-colors"
            >
                Extract Text
            </button>

            <div className="mt-4">
                <label className="text-gray-300">Extracted Text:</label>
                <textarea
                    value={extractedText}
                    readOnly
                    className="w-full h-32 bg-gray-700 text-white rounded p-2 mt-2"
                />
                <button
                    onClick={() => {
                        const blob = new Blob([extractedText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'extracted_text.txt';
                        document.body.appendChild(a);
                        a.click();
                        URL.revokeObjectURL(url);
                        a.remove();
                    }}
                    className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md mt-2 hover:bg-gray-800 transition-colors"
                >
                    Download Extracted Text
                </button>

            </div>
        </div>
    );
};

export default ImageProcessorL7;
