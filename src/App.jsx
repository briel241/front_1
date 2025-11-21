import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Setup from './pages/Setup';
import Home from './pages/Home';
import CreateTeam from './pages/CreateTeam';
import JoinTeam from './pages/JoinTeam';
import FocusMode from './pages/FocusMode';
import CardsPage from './pages/Cards';
import NewCard from './pages/NewCard';
import Schedule from './pages/Schedule';
import PersonalSchedule from './pages/PersonalSchedule';
import MyPage from './pages/MyPage';
import './index.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/setup" element={<Setup />} />
                <Route path="/home" element={<Home />} />
                <Route path="/create-team" element={<CreateTeam />} />
                <Route path="/join-team" element={<JoinTeam />} />
                <Route path="/focus-mode" element={<FocusMode />} />
                <Route path="/cards" element={<CardsPage />} />
                <Route path="/new-card" element={<NewCard />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/personal-schedule" element={<PersonalSchedule />} />
                <Route path="/mypage" element={<MyPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
