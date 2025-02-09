import React from 'react';

const FileInput: React.FC<{ onFileChange: (file: File) => void }> = ({ onFileChange }) => {
    return (
        <input
            type="file"
            accept=".bmp"
            onChange={(e) => {
                if (e.target.files) {
                    onFileChange(e.target.files[0]);
                }
            }}
        />
    );
};

export default FileInput;
