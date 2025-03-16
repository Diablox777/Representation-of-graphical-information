import React, { useState } from 'react';

// Главный компонент конвертера PCX в BMP
const PCXToBMPConverter: React.FC = () => {
    // Состояния для хранения данных изображения и ссылки на скачивание
    const [quantizedRGBA, setQuantizedRGBA] = useState<Uint8ClampedArray | null>(null); // Квантованные RGBA данные
    const [width, setWidth] = useState<number>(0); // Ширина изображения
    const [height, setHeight] = useState<number>(0); // Высота изображения
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null); // Ссылка для скачивания BMP файла

    // Обработчик выбора файла
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; // Получаем выбранный файл
        if (!file) return; // Если файл не выбран - выходим

        // Создаем объект FileReader для чтения содержимого файла
        const reader = new FileReader();
        reader.onload = (event) => {
            // Преобразуем содержимое файла в ArrayBuffer
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const data = new Uint8Array(arrayBuffer); // Преобразуем в массив байт
            
            // Декодируем PCX файл
            const pcx = decodePCX(data);
            
            // Устанавливаем ширину и высоту изображения
            setWidth(pcx.width);
            setHeight(pcx.height);
            
            // Квантуем изображение (уменьшаем количество цветов до 16)
            const quantResult = quantizeImage(pcx);
            
            // Рисуем оригинальное изображение на canvas
            drawImageToCanvas(pcx.width, pcx.height, pcx.imageData, 'originalCanvas');
            
            // Рисуем квантованное изображение на canvas
            drawImageToCanvas(pcx.width, pcx.height, quantResult.quantizedRGBA, 'quantizedCanvas');
            
            // Сохраняем квантованные данные
            setQuantizedRGBA(quantResult.quantizedRGBA);
            
            // Создаем BMP файл из квантованных данных
            const bmpFile = createBMP(pcx.width, pcx.height, quantResult.quantizedIndices, quantResult.palette);
            
            // Создаем Blob объект для скачивания
            const blob = new Blob([bmpFile], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            // Устанавливаем ссылку для скачивания
            setDownloadUrl(url);
        };
        reader.readAsArrayBuffer(file); // Читаем файл как ArrayBuffer
    };

    // Функция декодирования PCX файла
    function decodePCX(data: Uint8Array) {
        const dv = new DataView(data.buffer);
        
        // Проверяем сигнатуру PCX файла
        if (dv.getUint8(0) !== 0x0A) {
            throw "Это не PCX файл.";
        }
        
        // Проверяем версию PCX
        const version = dv.getUint8(1);
        if (version !== 5) {
            throw "Неподдерживаемая версия PCX.";
        }
        
        // Проверяем тип кодирования
        const encoding = dv.getUint8(2);
        if (encoding !== 1) {
            throw "Неподдерживаемое кодирование PCX.";
        }
        
        // Проверяем глубину цвета
        const bitsPerPixel = dv.getUint8(3);
        if (bitsPerPixel !== 8) {
            throw "Ожидается 256-цветный (8 бит) PCX файл.";
        }
        
        // Извлекаем размеры изображения
        const xMin = dv.getUint16(4, true);
        const yMin = dv.getUint16(6, true);
        const xMax = dv.getUint16(8, true);
        const yMax = dv.getUint16(10, true);
        const width = xMax - xMin + 1;
        const height = yMax - yMin + 1;
        
        // Извлекаем информацию о строках и плоскостях
        const bytesPerLine = dv.getUint16(66, true);
        const numPlanes = dv.getUint8(65);
        if (numPlanes !== 1) {
            throw "Неподдерживаемое число плоскостей.";
        }
        
        // Извлекаем палитру
        const paletteOffset = data.length - 768;
        const palette = [];
        for (let i = 0; i < 256; i++) {
            const r = data[paletteOffset + i * 3];
            const g = data[paletteOffset + i * 3 + 1];
            const b = data[paletteOffset + i * 3 + 2];
            palette.push([r, g, b]);
        }
        
        // Декодируем изображение
        const imageIndices = new Uint8Array(width * height); // Индексы цветов
        const imageData = new Uint8ClampedArray(width * height * 4); // RGBA данные
        let offset = 128; // Начало данных изображения
        
        // Проходим по каждой строке изображения
        for (let row = 0; row < height; row++) {
            let col = 0;
            while (col < bytesPerLine) {
                const byte = data[offset++];
                
                // Проверяем на RLE кодирование
                if ((byte & 0xC0) === 0xC0) {
                    const count = byte & 0x3F; // Количество повторений
                    const value = data[offset++];
                    
                    // Заполняем пиксели
                    for (let i = 0; i < count; i++) {
                        if (col < width) {
                            imageIndices[row * width + col] = value;
                            const color = palette[value];
                            const pixelIndex = (row * width + col) * 4;
                            imageData[pixelIndex] = color[0];     // R
                            imageData[pixelIndex + 1] = color[1]; // G
                            imageData[pixelIndex + 2] = color[2]; // B
                            imageData[pixelIndex + 3] = 255;      // A
                        }
                        col++;
                    }
                } else {
                    // Обычный пиксель
                    if (col < width) {
                        imageIndices[row * width + col] = byte;
                        const color = palette[byte];
                        const pixelIndex = (row * width + col) * 4;
                        imageData[pixelIndex] = color[0];     // R
                        imageData[pixelIndex + 1] = color[1]; // G
                        imageData[pixelIndex + 2] = color[2]; // B
                        imageData[pixelIndex + 3] = 255;      // A
                    }
                    col++;
                }
            }
        }
        
        // Возвращаем расшифрованные данные
        return { 
            width: width, 
            height: height, 
            imageData: imageData, 
            indices: imageIndices, 
            palette: palette 
        };
    }

    // Функция отрисовки изображения на canvas
    function drawImageToCanvas(width: number, height: number, imageData: Uint8ClampedArray, canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error("Не удалось получить контекст canvas");
        }
        
        // Создаем ImageData объект и отрисовываем его
        const imgData = new ImageData(imageData, width, height);
        ctx.putImageData(imgData, 0, 0);
    }

    // Функция квантования изображения (уменьшение количества цветов до 16)
    function quantizeImage(pcx: any) {
        const width = pcx.width, height = pcx.height;
        const indices = pcx.indices;
        const originalPalette = pcx.palette;
        
        // Подсчитываем частоту каждого цвета
        const freq = new Array(256).fill(0);
        for (let i = 0; i < indices.length; i++) {
            freq[indices[i]]++;
        }
        
        // Создаем список кандидатов на включение в новую палитру
        const candidates = [];
        for (let i = 0; i < 256; i++) {
            if (freq[i] > 0) {
                candidates.push({ index: i, color: originalPalette[i], frequency: freq[i] });
            }
        }
        
        // Сортируем кандидатов по частоте использования
        candidates.sort((a, b) => b.frequency - a.frequency);
        
        // Создаем новую палитру
        const newPalette = [];
        const selectedIndices = [];
        const THRESHOLD = 4000; // Порог различия между цветами
        
        // Добавляем наиболее часто используемые цвета
        for (const cand of candidates) {
            let tooSimilar = false;
            for (const sel of newPalette) {
                const delta = colorDelta(cand.color, sel);
                if (delta < THRESHOLD) {
                    tooSimilar = true;
                    break;
                }
            }
            if (!tooSimilar) {
                newPalette.push(cand.color);
                selectedIndices.push(cand.index);
            }
            if (newPalette.length >= 16) break;
        }
        
        // Если в палитре меньше 16 цветов - добавляем оставшиеся уникальные
        if (newPalette.length < 16) {
            for (const cand of candidates) {
                const exists = newPalette.some(col => col[0] === cand.color[0] && col[1] === cand.color[1] && col[2] === cand.color[2]);
                if (!exists) {
                    newPalette.push(cand.color);
                    selectedIndices.push(cand.index);
                    if (newPalette.length >= 16) break;
                }
            }
        }
        
        // Если все еще меньше 16 цветов - дополняем черным
        while (newPalette.length < 16) {
            newPalette.push([0, 0, 0]);
        }
        
        // Создаем новые индексы и RGBA данные
        const quantizedIndices = new Uint8Array(width * height);
        const quantizedRGBA = new Uint8ClampedArray(width * height * 4);
        
        // Для каждого пикселя находим ближайший цвет из новой палитры
        for (let i = 0; i < indices.length; i++) {
            const origColor = originalPalette[indices[i]];
            let bestIndex = 0;
            let bestDelta = Infinity;
            
            for (let j = 0; j < newPalette.length; j++) {
                const delta = colorDelta(origColor, newPalette[j]);
                if (delta < bestDelta) {
                    bestDelta = delta;
                    bestIndex = j;
                }
            }
            
            // Записываем новый индекс и RGBA значения
            quantizedIndices[i] = bestIndex;
            const off = i * 4;
            quantizedRGBA[off] = newPalette[bestIndex][0];
            quantizedRGBA[off + 1] = newPalette[bestIndex][1];
            quantizedRGBA[off + 2] = newPalette[bestIndex][2];
            quantizedRGBA[off + 3] = 255;
        }
        
        // Возвращаем результат квантования
        return { 
            quantizedIndices: quantizedIndices, 
            quantizedRGBA: quantizedRGBA, 
            palette: newPalette 
        };
    }

    // Функция расчета разницы между двумя цветами
    function colorDelta(c1: number[], c2: number[]) {
        const dr = c1[0] - c2[0];
        const dg = c1[1] - c2[1];
        const db = c1[2] - c2[2];
        return dr * dr + dg * dg + db * db;
    }

    // Функция создания BMP файла
    function createBMP(width: number, height: number, quantizedIndices: Uint8Array, newPalette: number[][]) {
        // Рассчитываем размер строки в байтах (должен быть кратен 4)
        const rowSize = Math.floor((4 * width + 31) / 32) * 4;
        const imageSize = rowSize * height; // Размер изображения в байтах
        const fileSize = 54 + 64 + imageSize; // Общий размер файла
        
        // Создаем массив байт для BMP файла
        const bmp = new Uint8Array(fileSize);
        const dv = new DataView(bmp.buffer);
        
        // Заполняем заголовок BMP файла
        dv.setUint8(0, 0x42); // 'B'
        dv.setUint8(1, 0x4D); // 'M'
        dv.setUint32(2, fileSize, true); // Размер файла
        dv.setUint32(6, 0, true); // Зарезервировано
        dv.setUint32(10, 54 + 64, true); // Смещение до данных изображения
        dv.setUint32(14, 40, true); // Размер заголовка информации
        dv.setInt32(18, width, true); // Ширина изображения
        dv.setInt32(22, height, true); // Высота изображения
        dv.setUint16(26, 1, true); // Число плоскостей
        dv.setUint16(28, 4, true); // Бит на пиксель
        dv.setUint32(30, 0, true); // Метод сжатия
        dv.setUint32(34, imageSize, true); // Размер изображения
        dv.setInt32(38, 2835, true); // Горизонтальное разрешение
        dv.setInt32(42, 2835, true); // Вертикальное разрешение
        dv.setUint32(46, 16, true); // Число цветов в палитре
        dv.setUint32(50, 0, true); // Важные цвета
        
        // Записываем палитру
        for (let i = 0; i < 16; i++) {
            const color = newPalette[i] || [0, 0, 0];
            dv.setUint8(54 + i * 4, color[2]); // B
            dv.setUint8(54 + i * 4 + 1, color[1]); // G
            dv.setUint8(54 + i * 4 + 2, color[0]); // R
            dv.setUint8(54 + i * 4 + 3, 0); // Зарезервировано
        }
        
        let offset = 54 + 64; // Текущее смещение в файле
        
        // Записываем данные изображения
        for (let row = height - 1; row >= 0; row--) {
            const rowStart = row * width;
            for (let col = 0; col < width; col += 2) {
                const pixel1 = quantizedIndices[rowStart + col];
                const pixel2 = (col + 1 < width) ? quantizedIndices[rowStart + col + 1] : 0;
                const byte = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
                bmp[offset++] = byte;
            }
            
            // Дополняем строку до кратности 4
            while (offset % 4 !== 0) {
                bmp[offset++] = 0;
            }
        }
        
        return bmp; // Возвращаем готовый BMP файл
    }

    // JSX разметка компонента
    return (
        <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg p-6">
            {/* Заголовок */}
            <h1 className="text-3xl font-bold text-center mb-4 text-blue-600">Конвертер PCX (256 цветов) → BMP (16 цветов)</h1>
            
            {/* Описание */}
            <p className="mb-4 text-gray-700">
                Загрузите 256‑цветный PCX файл, чтобы конвертировать его в BMP формат с 16 цветами. После загрузки вы сможете скачать преобразованное изображение.
            </p>
            
            {/* Поле выбора файла */}
            <input type="file" className="mb-4 border border-gray-300 rounded p-2 w-full" accept=".pcx" onChange={handleFileChange} />
            
            {/* Оригинальное изображение */}
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Исходное изображение</h2>
                <canvas id="originalCanvas" className="border border-black w-full h-64"></canvas>
            </div>
            
            {/* Конвертированное изображение */}
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Изображение после конвертирования</h2>
                <canvas id="quantizedCanvas" className="border border-black w-full h-64"></canvas>
            </div>
            
            {/* Кнопки управления */}
            <div className="flex justify-between">
                {/* Кнопка скачивания */}
                {downloadUrl && (
                    <a href={downloadUrl} download="converted_image.bmp" className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition">
                        Скачать BMP файл
                    </a>
                )}
                
                {/* Кнопка сброса */}
                <button onClick={() => window.location.reload()} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition">
                    Сбросить
                </button>
            </div>
        </div>
    );
};

export default PCXToBMPConverter;