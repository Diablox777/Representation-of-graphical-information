import React from 'react';
import FileInput from './FileInput';
import { processBmpRotation } from '../utils/bmpProcessor';

const ImageProcessorL3: React.FC = () => {
    const handleFileChange = (file: File) => {
        processBmpRotation(file)
            .then(() => alert('Image rotated successfully!'))
            .catch((error: any) => alert(`Error: ${error.message}`));
    };

    return (
        <div>
            <h2>Rotate BMP Image</h2>
            <FileInput onFileChange={handleFileChange} />
        </div>
    );
};

export default ImageProcessorL3;
