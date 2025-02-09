import React from 'react';
import FileInput from './FileInput';
import { processBmpToGrayscale } from '../utils/bmpProcessor';

const ImageProcessorL1: React.FC = () => {
    const handleFileChange = (file: File) => {
        processBmpToGrayscale(file)
            .then(() => alert('Image processed to grayscale!'))
            .catch((error) => alert(`Error: ${error.message}`));
    };

    return (
        <div>
            <h2>Convert BMP to Grayscale</h2>
            <FileInput onFileChange={handleFileChange} />
        </div>
    );
};

export default ImageProcessorL1;
