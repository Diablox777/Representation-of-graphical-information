export const processBmpToGrayscale = async (file: File): Promise<void> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const dataView = new DataView(arrayBuffer);
            const header = {
                id: dataView.getUint16(0, true),
                bmOffset: dataView.getUint32(10, true),
                width: dataView.getInt32(18, true),
                height: dataView.getInt32(22, true),
                bitperpixel: dataView.getUint16(28, true),
                clrUsed: dataView.getUint32(46, true) || 256
            };

            if (header.id !== 0x4D42 || header.bitperpixel !== 8) {
                reject(new Error('Invalid BMP format!'));
                return;
            }

            const paletteOffset = 54; // Start of the palette after the header
            const palette = new Uint8Array(arrayBuffer, paletteOffset, header.clrUsed * 4);
            
            for (let i = 0; i < header.clrUsed * 4; i += 4) {
                // BGR -> Grayscale (NTSC formula)
                const avg = Math.round(
                    palette[i + 2] * 0.299 + 
                    palette[i + 1] * 0.587 + 
                    palette[i] * 0.114
                );

                palette[i] = avg;
                palette[i + 1] = avg;
                palette[i + 2] = avg;
            }

            const newBlob = new Blob([arrayBuffer], { type: 'image/bmp' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(newBlob);
            link.download = 'grayscale.bmp';
            link.click();

            resolve();
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};

export const processBmpWithBorder = async (file: File): Promise<void> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const dataView = new DataView(arrayBuffer);
            const header = {
                type: dataView.getUint16(0, true),
                fileSize: dataView.getUint32(2, true),
                pixelOffset: dataView.getUint32(10, true),
                headerSize: dataView.getUint32(14, true),
                width: dataView.getInt32(18, true),
                height: dataView.getInt32(22, true),
                bpp: dataView.getUint16(28, true),
                compression: dataView.getUint32(30, true),
                colorsUsed: dataView.getUint32(46, true) || 256
            };

            if (header.type !== 0x4D42 || header.compression !== 0) {
                reject(new Error('Unsupported BMP format!'));
                return;
            }

            const border = 15;
            const bytesPerPixel = header.bpp === 8 ? 1 : header.bpp === 24 ? 3 : 4;
            const originalWidth = header.width;
            const originalHeight = Math.abs(header.height);
            const isTopDown = header.height < 0;

            const originalRowSize = originalWidth * bytesPerPixel;
            const originalPadding = (4 - (originalRowSize % 4)) % 4;

            const newWidth = originalWidth + 2 * border;
            const newHeight = originalHeight + 2 * border;
            const newRowSize = newWidth * bytesPerPixel;
            const newPadding = (4 - (newRowSize % 4)) % 4;

            const newFileSize = 54 + 
                (header.bpp === 8 ? 1024 : 0) + 
                (newRowSize + newPadding) * newHeight;
            
            const newBuffer = new ArrayBuffer(newFileSize);
            const newView = new DataView(newBuffer);

            for (let i = 0; i < arrayBuffer.byteLength; i++) {
                newView.setUint8(i, dataView.getUint8(i));
            }

            newView.setInt32(18, newWidth, true); // Width
            newView.setInt32(22, isTopDown ? -newHeight : newHeight, true); // Height
            newView.setUint32(34, newRowSize + newPadding, true); // Image size
            newView.setUint32(2, newFileSize, true); // Total file size
            newView.setUint32(10, 54 + (header.bpp === 8 ? 1024 : 0), true); // Pixel offset

            if (header.bpp === 8) {
                const palette = new Uint8Array(arrayBuffer, 54, 1024);
                new Uint8Array(newBuffer).set(palette, 54);
            }

            // Process pixel data
            const originalData = new Uint8Array(arrayBuffer, header.pixelOffset);
            const newData = new Uint8Array(newBuffer, 54 + (header.bpp === 8 ? 1024 : 0));

            let newPos = 0;
            
            // Generate top border
            for (let y = 0; y < border; y++) {
                for (let x = 0; x < newWidth; x++) {
                    generateRandomPixel(newData, newPos, bytesPerPixel);
                    newPos += bytesPerPixel;
                }
                newPos += newPadding;
            }

            for (let y = 0; y < originalHeight; y++) {
                // Left border
                for (let x = 0; x < border; x++) {
                    generateRandomPixel(newData, newPos, bytesPerPixel);
                    newPos += bytesPerPixel;
                }

                // Main image
                const originalRowStart = y * (originalRowSize + originalPadding);
                for (let x = 0; x < originalWidth; x++) {
                    for (let b = 0; b < bytesPerPixel; b++) {
                        newData[newPos + b] = originalData[originalRowStart + x * bytesPerPixel + b];
                    }
                    newPos += bytesPerPixel;
                }

                // Right border
                for (let x = 0; x < border; x++) {
                    generateRandomPixel(newData, newPos, bytesPerPixel);
                    newPos += bytesPerPixel;
                }

                newPos += newPadding;
            }

            // Generate bottom border
            for (let y = 0; y < border; y++) {
                for (let x = 0; x < newWidth; x++) {
                    generateRandomPixel(newData, newPos, bytesPerPixel);
                    newPos += bytesPerPixel;
                }
                newPos += newPadding;
            }

            // Save the result
            const blob = new Blob([newBuffer], { type: 'image/bmp' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'bordered.bmp';
            link.click();
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};

// Function to generate a random pixel
function generateRandomPixel(data: Uint8Array, pos: number, bytesPerPixel: number) {
    if (bytesPerPixel === 1) { // 8-bit
        data[pos] = Math.floor(Math.random() * 256);
    } else { // 24/32 bits
        for (let i = 0; i < bytesPerPixel; i++) {
            data[pos + i] = Math.floor(Math.random() * 256);
        }
    }
}

export const processBmpFile = async (file: File): Promise<void> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const dataView = new DataView(arrayBuffer);
            
            // Parse BMP header
            const header = {
                type: dataView.getUint16(0, true),
                fileSize: dataView.getUint32(2, true),
                pixelOffset: dataView.getUint32(10, true),
                width: dataView.getInt32(18, true),
                height: dataView.getInt32(22, true),
                bpp: dataView.getUint16(28, true),
                compression: dataView.getUint32(30, true),
                colorsUsed: dataView.getUint32(46, true) || (1 << (dataView.getUint16(28, true) || 1))
            };

            // Validate format
            if (header.type !== 0x4D42 || header.compression !== 0) {
                reject(new Error('Unsupported BMP format!'));
                return;
            }

            // Setup canvas
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            canvas.width = header.width;
            canvas.height = Math.abs(header.height);
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            
            // Read palette
            let palette = [];
            if (header.bpp <= 8) {
                const paletteOffset = 54;
                const colors = header.bpp === 4 ? 16 : 256;
                for (let i = 0; i < colors; i++) {
                    palette.push({
                        b: dataView.getUint8(paletteOffset + i * 4),
                        g: dataView.getUint8(paletteOffset + i * 4 + 1),
                        r: dataView.getUint8(paletteOffset + i * 4 + 2)
                    });
                }
            }

            // Read pixel data
            const pixels = new Uint8Array(arrayBuffer, header.pixelOffset);
            const bytesPerPixel = header.bpp === 4 ? 0.5 : header.bpp === 8 ? 1 : 3;
            const rowSize = Math.floor((header.bpp * header.width + 31) / 32) * 4;

            // Process pixels row by row
            for (let y = header.height > 0 ? header.height - 1 : 0; 
                 header.height > 0 ? y >= 0 : y < Math.abs(header.height); 
                 header.height > 0 ? y-- : y++) {
                
                let rowOffset = y * rowSize;
                
                for (let x = 0; x < header.width; x++) {
                    let r, g, b;
                    
                    if (header.bpp === 4) { // 16 colors
                        const byte = pixels[rowOffset + Math.floor(x / 2)];
                    const nibble = x % 2 === 0 ? byte >> 4 : byte & 0x0F;
                    const color = palette[nibble] || { r: 0, g: 0, b: 0 };
                    r = color.r;
                    g = color.g;
                    b = color.b;

                    }
                    else if (header.bpp === 8) { // 256 colors
                    const index = pixels[rowOffset + x];
                    const color = palette[index] || { r: 0, g: 0, b: 0 };
                    r = color.r;
                    g = color.g;
                    b = color.b;

                    }
                    else if (header.bpp === 24) { // TrueColor
                        const offset = rowOffset + x * 3;
                        b = pixels[offset] || 0;
                        g = pixels[offset + 1] || 0;
                        r = pixels[offset + 2] || 0;

                    }

                    // Write to ImageData
                    const canvasY = header.height > 0 ? header.height - 1 - y : y;
                    const pos = (canvasY * canvas.width + x) * 4;
                    imageData.data[pos] = r || 0;
                    imageData.data[pos + 1] = g || 0;
                    imageData.data[pos + 2] = b || 0;
                    imageData.data[pos + 3] = 255; // Alpha channel

                }
            }

            // Display on canvas
            ctx.putImageData(imageData, 0, 0);
            resolve();
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};

export const processBmpRotation = async (file: File): Promise<void> => {

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const dataView = new DataView(arrayBuffer);

            // Парсинг заголовка BMP
            const header = {
                type: dataView.getUint16(0, true), // Тип файла (должно быть 0x4D42)
                fileSize: dataView.getUint32(2, true), // Размер файла
                pixelOffset: dataView.getUint32(10, true), // Смещение до пиксельных данных
                headerSize: dataView.getUint32(14, true), // Размер заголовка (40 для BITMAPINFOHEADER)
                width: dataView.getInt32(18, true), // Ширина изображения
                height: dataView.getInt32(22, true), // Высота изображения
                bpp: dataView.getUint16(28, true), // Бит на пиксель (24 для TrueColor)
                compression: dataView.getUint32(30, true), // Тип сжатия (0 для несжатого)
                imageSize: dataView.getUint32(34, true), // Размер изображения в байтах
                colorsUsed: dataView.getUint32(46, true) // Количество используемых цветов
            };

            // Проверка формата
            if (header.type !== 0x4D42 || header.bpp !== 24 || header.compression !== 0) {
                reject(new Error('Неподдерживаемый формат BMP! Требуется 24-битный TrueColor BMP без сжатия.'));
                return;
            }

            const originalWidth = header.width;
            const originalHeight = Math.abs(header.height);
            const isTopDown = header.height < 0; // Если высота отрицательная, изображение хранится сверху вниз

            // Размер строки в байтах с учетом выравнивания
            const originalRowSize = Math.floor((header.bpp * originalWidth + 31) / 32) * 4;
            const originalPadding = originalRowSize - (originalWidth * 3); // Выравнивающие байты

            // Новые размеры после поворота на 90 градусов
            const newWidth = originalHeight;
            const newHeight = originalWidth;
            const newRowSize = Math.floor((header.bpp * newWidth + 31) / 32) * 4;
            const newPadding = newRowSize - (newWidth * 3);

            // Новый размер файла
            const newFileSize = header.pixelOffset + (newRowSize * newHeight);

            // Создание нового ArrayBuffer для повернутого изображения
            const newBuffer = new ArrayBuffer(newFileSize);
            const newView = new DataView(newBuffer);

            // Копирование заголовка
            for (let i = 0; i < header.pixelOffset; i++) {
                newView.setUint8(i, dataView.getUint8(i));
            }

            // Обновление заголовка
            newView.setInt32(18, newWidth, true); // Новая ширина
            newView.setInt32(22, isTopDown ? -newHeight : newHeight, true); // Новая высота
            newView.setUint32(34, newRowSize * newHeight, true); // Новый размер изображения
            newView.setUint32(2, newFileSize, true); // Новый размер файла

            // Обработка пиксельных данных
            const originalData = new Uint8Array(arrayBuffer, header.pixelOffset);
            const newData = new Uint8Array(newBuffer, header.pixelOffset);

            for (let y = 0; y < originalHeight; y++) {
                for (let x = 0; x < originalWidth; x++) {
                    // Позиция в исходном изображении
                    const originalPos = y * originalRowSize + x * 3;

                    // Позиция в новом изображении (поворот на 90 градусов)
                    const newX = y;
                    const newY = newHeight - 1 - x;
                    const newPos = newY * newRowSize + newX * 3;

                    // Копирование пикселя
                    newData[newPos] = originalData[originalPos]; // Синий
                    newData[newPos + 1] = originalData[originalPos + 1]; // Зеленый
                    newData[newPos + 2] = originalData[originalPos + 2]; // Красный
                }
            }

            // Добавление выравнивающих байтов
            for (let y = 0; y < newHeight; y++) {
                for (let p = 0; p < newPadding; p++) {
                    newData[y * newRowSize + newWidth * 3 + p] = 0;
                }
            }

            // Сохранение результата
            const blob = new Blob([newBuffer], { type: 'image/bmp' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'rotated_90.bmp';
            link.click();

            resolve();
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};
