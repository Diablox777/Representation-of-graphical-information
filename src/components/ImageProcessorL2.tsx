import React, { useState } from 'react';
import FileInput from './FileInput';
import { processBmpWithBorder } from '../utils/bmpProcessor';

const ImageProcessorL2: React.FC = () => {
    const [message, setMessage] = useState<string | null>(null);

    const handleFileChange = (file: File) => {
        processBmpWithBorder(file)
            .then(() => setMessage('Image processed with border!'))
            .catch((error: any) => setMessage(`Error: ${error.message}`));
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-antique-gold text-2xl font-bold mb-4">Add Border to BMP Image</h2>
            <p className="text-gray-300 mb-4">Upload a BMP image to add a decorative border.</p>
            <FileInput onFileChange={handleFileChange} />
            {message && <p className="text-antique-gold mt-4">{message}</p>}
        </div>
    );
};

export default ImageProcessorL2;