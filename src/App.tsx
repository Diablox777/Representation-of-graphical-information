import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import ImageProcessorL1 from './components/ImageProcessorL1';
import ImageProcessorL2 from './components/ImageProcessorL2';
import ImageProcessorL3 from './components/ImageProcessorL3';

const App: React.FC = () => {
    return (
        <Router>
            <div className="App">
                <h1 className="text-3xl font-bold">BMP Image Processor</h1>
                <div className="flex space-x-4">
                    <Link to="/l1" className="btn">Convert to Grayscale</Link>
                    <Link to="/l2" className="btn">Add Border</Link>
                    <Link to="/l3" className="btn">Rotate Image</Link>
                </div>
                <Routes>
                    <Route path="/l1" element={<ImageProcessorL1 />} />
                    <Route path="/l2" element={<ImageProcessorL2 />} />
                    <Route path="/l3" element={<ImageProcessorL3 />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
