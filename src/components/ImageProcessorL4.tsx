import React, { useState } from 'react';
import FileInput from './FileInput';
import { processBmpFile } from '../utils/bmpProcessor';

const ImageProcessorL4: React.FC = () => {
    const [message, setMessage] = useState<string | null>(null);

    const handleFileChange = (file: File) => {
        processBmpFile(file)
            .then(() => setMessage('BMP file processed successfully!'))
            .catch((error) => setMessage(`Error: ${error.message}`));
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-antique-gold text-2xl font-bold mb-4">BMP File Processor</h2>
            <p className="text-gray-300 mb-4">Upload a BMP file to process and display it.</p>
            <FileInput onFileChange={handleFileChange} />
            {message && <p className="text-antique-gold mt-4">{message}</p>}
            <canvas id="canvas" className="mt-4"></canvas>
        </div>
    );
};

export default ImageProcessorL4;
