import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Storage } from '../utils/storage';
import backIcon from '../assets/back.png';
import Logo from '../components/Logo';

function Schedule() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('project');
    const [cellOverlapCount, setCellOverlapCount] = useState(new Map());
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const profile = Storage.get('userProfile');
        if (!profile) {
            navigate('/');
            return;
        }

        // 팀의 모든 사용자 일정 불러오기
        if (!projectId) return;

        // 모든 localStorage 키에서 해당 프로젝트의 개인 일정 찾기
        const teamSchedules = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`personalSchedule_${projectId}_`)) {
                const schedule = Storage.get(key);
                if (schedule && Array.isArray(schedule)) {
                    teamSchedules.push(schedule);
                }
            }
        }

        // 각 셀에 대해 몇 명이 선택했는지 카운트
        const overlapMap = new Map();
        teamSchedules.forEach(schedule => {
            schedule.forEach(cellKey => {
                const count = overlapMap.get(cellKey) || 0;
                overlapMap.set(cellKey, count + 1);
            });
        });

        setCellOverlapCount(overlapMap);
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

    // 셀의 겹침 개수 가져오기
    const getCellOverlapCount = (time, dayIndex) => {
        const cellKey = `${time}-${dayIndex}`;
        return cellOverlapCount.get(cellKey) || 0;
    };

    // 겹침 개수에 따른 색상 계산 (0명: 투명, 1명: 연한 색, 많을수록 진한 색)
    const getCellStyle = (time, dayIndex) => {
        const count = getCellOverlapCount(time, dayIndex);
        if (count === 0) {
            return {};
        }

        // 최대 5명까지 가정 (더 많으면 최대값으로 처리)
        const maxCount = 5;
        const normalizedCount = Math.min(count, maxCount);
        const opacity = 0.3 + (normalizedCount / maxCount) * 0.7; // 0.3 ~ 1.0
        
        // 색상: 연한 핑크에서 진한 핑크/레드로
        const red = 255;
        const green = Math.max(100, 255 - (normalizedCount * 30));
        const blue = Math.max(100, 255 - (normalizedCount * 40));

        return {
            backgroundColor: `rgba(${red}, ${green}, ${blue}, ${opacity})`,
            borderColor: `rgba(${red}, ${green}, ${blue}, ${opacity})`
        };
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
                        팀 일정 보기
                    </h2>
                    <div className="progress-bar-container">
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            <span className="progress-start">0</span>
                            <span className="progress-end">N</span>
                        </div>
                    </div>
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
                                const overlapCount = getCellOverlapCount(time, dayIndex);
                                const cellStyle = getCellStyle(time, dayIndex);
                                return (
                                    <div 
                                        key={`${time}-${dayIndex}`} 
                                        className="schedule-cell schedule-data schedule-view-only"
                                        style={cellStyle}
                                        title={overlapCount > 0 ? `${overlapCount}명이 가능한 시간` : ''}
                                    ></div>
                                );
                            })
                        ])}
                    </div>
                </div>
                <button 
                    className="btn btn-pink schedule-register-btn"
                    onClick={() => navigate('/personal-schedule' + (projectId ? `?project=${projectId}` : ''))}
                >
                    일정 등록하기
                </button>
            </div>
        </div>
    );
}

export default Schedule;

