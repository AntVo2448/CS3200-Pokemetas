import React from 'react';
import './App.css';
import './index.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import SingleTeamEval from './pages/SingleTeamEval';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import MyTeams from './pages/MyTeams';

import Navbar from './components/navbar/Navbar';

function App() {
  return (
    <div className='App'>
      <Router>
        <Navbar />
        <Routes>
          <Route exact path="/" element={<Home />} /> 
          <Route exact path="/home" element={<Home />} /> 
          <Route exact path="/single-team-eval" element={<SingleTeamEval />}/>
          <Route exact path="/login" element={<Login />}/>
          <Route exact path="/my-teams" element={<MyTeams />}/>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate replace to="/404" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
