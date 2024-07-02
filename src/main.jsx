import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import ExerciseList from './base.jsx';
import Intructions from './instructions.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
      <Route path="/" element={<ExerciseList />} />
      <Route path="/instructions" element={<Intructions />} />
        <Route path="/exercise/:exercise/:step" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>,
);
