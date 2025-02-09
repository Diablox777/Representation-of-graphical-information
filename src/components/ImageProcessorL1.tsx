import React, { useState } from 'react';
import FileInput from './FileInput';
import { processBmpToGrayscale } from '../utils/bmpProcessor';

const ImageProcessorL1: React.FC = () => {
    const [message, setMessage] = useState<string | null>(null);

    const handleFileChange = (file: File) => {
        processBmpToGrayscale(file)
            .then(() => setMessage('Image processed to grayscale!'))
            .catch((error) => setMessage(`Error: ${error.message}`));
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-antique-gold text-2xl font-bold mb-4">Convert BMP to Grayscale</h2>
            <p className="text-gray-300 mb-4">Upload a BMP image to convert it to grayscale.</p>
            <FileInput onFileChange={handleFileChange} />
            {message && <p className="text-antique-gold mt-4">{message}</p>}
        </div>
    );
};

export default ImageProcessorL1;
