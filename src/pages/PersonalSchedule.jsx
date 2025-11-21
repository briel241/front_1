import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Storage } from '../utils/storage';
import backIcon from '../assets/back.png';
import Logo from '../components/Logo';

function PersonalSchedule() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('project');
    const [selectedCells, setSelectedCells] = useState(new Set());

    useEffect(() => {
        const profile = Storage.get('userProfile');
        if (!profile) {
            navigate('/');
            return;
        }
        // userId 생성 또는 가져오기
        if (!profile.userId) {
            profile.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            Storage.set('userProfile', profile);
        }
        // 기존 개인 일정 불러오기
        if (projectId && profile.userId) {
            const personalSchedule = Storage.get(`personalSchedule_${projectId}_${profile.userId}`) || [];
            const cellSet = new Set(personalSchedule);
            setSelectedCells(cellSet);
        }
    }, [navigate, projectId]);

    // 현재 날짜 기준으로 7일 생성
    const getNext7Days = () => {
        const today = new Date();
        const days = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push({
                date: date.getDate(),
                fullDate: date
            });
        }
        return days;
    };

    const days = getNext7Days();
    const times = [];
    for (let hour = 9; hour <= 24; hour++) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
    }

    const toggleCell = (time, dayIndex) => {
        const cellKey = `${time}-${dayIndex}`;
        setSelectedCells(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cellKey)) {
                newSet.delete(cellKey);
            } else {
                newSet.add(cellKey);
            }
            return newSet;
        });
    };

    const isCellSelected = (time, dayIndex) => {
        return selectedCells.has(`${time}-${dayIndex}`);
    };

    const handleComplete = () => {
        const profile = Storage.get('userProfile');
        if (projectId && profile && profile.userId) {
            // 선택된 셀들을 배열로 변환하여 저장 (userId 포함)
            const scheduleData = Array.from(selectedCells);
            Storage.set(`personalSchedule_${projectId}_${profile.userId}`, scheduleData);
        }
        // 팀 일정 보기 페이지로 돌아가기
        navigate('/schedule' + (projectId ? `?project=${projectId}` : ''));
    };

    return (
        <div className="container">
            <div className="header">
                <img 
                    src={backIcon} 
                    alt="뒤로가기" 
                    className="back-arrow" 
                    onClick={() => navigate('/home')}
                    style={{ cursor: 'pointer', width: '24px', height: '24px' }}
                />
                <Logo 
                    style={{ height: '19px', width: 'auto', objectFit: 'contain' }}
                />
            </div>
            <div className="content">
                <div className="schedule-header">
                    <h2 className="subtitle" style={{ margin: 0 }}>
                        개인 일정 등록
                    </h2>
                </div>
                <div className="schedule-container">
                    <div className="schedule-grid">
                        <div className="schedule-cell schedule-empty"></div>
                        {days.map((day, index) => (
                            <div key={index} className="schedule-cell schedule-day">
                                {day.date}
                            </div>
                        ))}
                        {times.flatMap((time) => [
                            <div key={`${time}-time`} className="schedule-cell schedule-time">{time}</div>,
                            ...days.map((day, dayIndex) => {
                                const selected = isCellSelected(time, dayIndex);
                                return (
                                    <div 
                                        key={`${time}-${dayIndex}`} 
                                        className={`schedule-cell schedule-data ${selected ? 'selected' : ''}`}
                                        onClick={() => toggleCell(time, dayIndex)}
                                    ></div>
                                );
                            })
                        ])}
                    </div>
                </div>
                <button 
                    className="btn btn-pink schedule-register-btn"
                    onClick={handleComplete}
                >
                    완료
                </button>
            </div>
        </div>
    );
}

export default PersonalSchedule;

