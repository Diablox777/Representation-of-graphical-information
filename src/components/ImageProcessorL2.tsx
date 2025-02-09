import React from 'react';
import FileInput from './FileInput';
import { processBmpWithBorder } from '../utils/bmpProcessor';

const ImageProcessorL2: React.FC = () => {
    const handleFileChange = (file: File) => {
        processBmpWithBorder(file)
            .then(() => alert('Image processed with border!'))
            .catch((error: any) => alert(`Error: ${error.message}`));
    };

    return (
        <div>
            <h2>Add Border to BMP Image</h2>
            <FileInput onFileChange={handleFileChange} />
        </div>
    );
};

export default ImageProcessorL2;
