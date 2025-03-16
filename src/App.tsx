import React, { useState } from 'react';
import PCXToBMPConverter from './components/PCXToBMPConverter';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import ImageProcessorL1 from './components/ImageProcessorL1';
import ImageProcessorL2 from './components/ImageProcessorL2';
import ImageProcessorL3 from './components/ImageProcessorL3';
import ImageProcessorL4 from './components/ImageProcessorL4';
import ImageProcessorL5 from './components/ImageProcessorL5';
import ImageProcessorL6 from './components/ImageProcessorL6';
import ImageProcessorL7 from './components/ImageProcessorL7';
import PCXDecoder from './components/PCXDecoder';

const App: React.FC = () => {
    return (
        <Router>
            <div className="App">
                <h1 className="text-4xl font-bold text-antique-gold mb-6">BMP Image Processor</h1>
                <div className="flex space-x-4 mb-4">
                    <Link to="/l1" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 1</Link>
                    <Link to="/l2" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 2</Link>
                    <Link to="/l3" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 3</Link>
                    <Link to="/l4" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 4</Link>
                    <Link to="/l5" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 5</Link>
                    <Link to="/l6" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 6</Link>
                    <Link to="/l7" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 7</Link>
                    <Link to="/l8" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">Lab 8</Link>
                    <Link to="/rgr" className="bg-antique-gold text-gray-900 py-2 px-4 rounded-md transition duration-300 hover:bg-gray-800">RGR</Link>
                </div>
                <Routes>
                    <Route path="/l1" element={<ImageProcessorL1 />} />
                    <Route path="/l2" element={<ImageProcessorL2 />} />
                    <Route path="/l3" element={<ImageProcessorL3 />} />
                    <Route path="/l4" element={<ImageProcessorL4 />} />
                    <Route path="/l5" element={<ImageProcessorL5 />} />
                    <Route path="/l6" element={<ImageProcessorL6 />} />
                    <Route path="/l7" element={<ImageProcessorL7 />} />
                    <Route path="/l8" element={<PCXDecoder />} />
                    <Route path="/rgr" element={<PCXToBMPConverter />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
