import React from 'react';

const FileInput: React.FC<{ onFileChange: (file: File) => void }> = ({ onFileChange }) => {
    return (
        <input
            type="file"
            accept=".bmp"
            className="bg-gray-800 border border-8 border-antique-gold text-white py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-antique-gold"
            onChange={(e) => {
                if (e.target.files) {
                    onFileChange(e.target.files[0]);
                }
            }}
        />
    );
};

export default FileInput;
