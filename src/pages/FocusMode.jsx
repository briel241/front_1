import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Projects } from '../utils/projects';
import { Storage } from '../utils/storage';
import { FocusTimer } from '../utils/timer';
import { sendFocusSession } from '../utils/api';
import Logo from '../components/Logo';
import backIcon from '../assets/back.png';
import focusModeIcon from '../assets/focusmode.png';

function FocusMode() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('project');
    const [project, setProject] = useState(null);
    const [timeDisplay, setTimeDisplay] = useState('00:00');
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const sessionStartTimeRef = useRef(null); // 세션 시작 시간 추적
    const lastSavedSecondsRef = useRef(0); // 마지막으로 저장한 초 단위 시간

    useEffect(() => {
        const profile = Storage.get('userProfile');
        if (!profile) {
            navigate('/');
            return;
        }

        if (projectId) {
            const projects = Projects.getAll();
            const foundProject = projects.find((p) => p.id === projectId);
            if (foundProject) {
                setProject(foundProject);
            }
        }

        // 타이머 초기화
        timerRef.current = new FocusTimer((timeString) => {
            setTimeDisplay(timeString);
        });

        // 컴포넌트 언마운트 시 타이머 정지
        return () => {
            if (timerRef.current && timerRef.current.isRunning) {
                timerRef.current.pause();
            }
        };
    }, [projectId, navigate]);

    /**
     * 세션 데이터를 백엔드로 전송하는 함수
     * @param {number} focusSeconds - 집중한 시간 (초 단위)
     */
    const saveSessionData = async (focusSeconds = null) => {
        const profile = Storage.get('userProfile');
        if (!profile || !projectId) {
            return;
        }

        // focusSeconds가 제공되지 않으면 타이머에서 계산
        const seconds = focusSeconds !== null 
            ? focusSeconds 
            : Math.floor(timerRef.current.elapsed / 1000);

        // 최소 1초 이상 집중했을 때만 전송 (의미있는 데이터만)
        if (seconds <= 0) {
            return;
        }

        // 이미 저장한 시간은 제외하고 새로 추가된 시간만 전송
        const newSeconds = seconds - lastSavedSecondsRef.current;
        if (newSeconds <= 0) {
            return;
        }

        // 세션 정보 생성
        const sessionData = {
            userId: profile.id || profile.name || 'me', // 사용자 ID (없으면 이름 사용)
            projectId: projectId,
            focusSeconds: newSeconds, // 새로 추가된 시간만 전송
        };

        console.log('세션 정보 전송:', sessionData);

        // 백엔드로 전송
        const result = await sendFocusSession(sessionData);
        
        if (result.success) {
            console.log('세션 정보 전송 성공');
            // 성공적으로 전송된 시간 업데이트
            lastSavedSecondsRef.current = seconds;
        } else {
            console.warn('세션 정보 전송 실패:', result.error);
        }

        // 로컬 스토리지에도 총 집중 시간 저장 (기존 로직 유지)
        const currentTime = Storage.get('totalFocusTime') || 0;
        Storage.set('totalFocusTime', currentTime + newSeconds);
    };

    const startTimer = () => {
        if (timerRef.current) {
            timerRef.current.start();
            setIsRunning(true);
            // 세션 시작 시간 기록
            sessionStartTimeRef.current = Date.now();
        }
    };

    const pauseTimer = async () => {
        if (timerRef.current) {
            timerRef.current.pause();
            setIsRunning(false);

            // 집중 시간 계산
            const seconds = Math.floor(timerRef.current.elapsed / 1000);
            
            // 세션 정보를 백엔드로 전송 (중간 저장)
            if (seconds > 0) {
                await saveSessionData(seconds);
            }
        }
    };

    return (
        <div className="container">
            <div className="header">
                <img 
                    src={backIcon} 
                    alt="뒤로가기" 
                    className="back-arrow" 
                    onClick={() => navigate(-1)}
                    style={{ cursor: 'pointer', width: '24px', height: '24px' }}
                />
                <Logo 
                    style={{ height: '19px', width: 'auto', objectFit: 'contain' }}
                />
            </div>
            <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                    src={focusModeIcon} 
                    alt="집중 모드" 
                    style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
                />
                <span>집중 모드</span>
            </div>
            <div className="content">
                <div className="focus-timer-block">
                    <div className="project-title-focus">
                        {project ? project.title : '프로젝트 이름'}
                    </div>
                    <div className="timer-display">{timeDisplay}</div>
                    <div className="timer-buttons">
                        <button
                            className="btn btn-primary"
                            onClick={isRunning ? pauseTimer : startTimer}
                        >
                            {isRunning ? '일시정지' : '시작'}
                        </button>
                        <button className="btn btn-secondary" onClick={pauseTimer}>
                            휴식
                        </button>
                    </div>
                </div>
                <div className="team-status-block">
                    <h3 className="team-status-title">팀원 상태</h3>
                    <div>
                        <div className="status-item">
                            <div className="status-left">
                                <div className="status-avatar" style={{ backgroundColor: '#E26D59' }}></div>
                                <div className="status-info">
                                    <span className="status-name">이름</span>
                                    <span className="status-label">집중 중</span>
                                </div>
                            </div>
                            <span className="status-time">00:00</span>
                        </div>
                        <div className="status-item">
                            <div className="status-left">
                                <div className="status-avatar" style={{ backgroundColor: '#e0e0e0' }}></div>
                                <div className="status-info">
                                    <span className="status-name">이름</span>
                                    <span className="status-label">오프라인</span>
                                </div>
                            </div>
                            <span className="status-time">00:00</span>
                        </div>
                        <div className="status-item">
                            <div className="status-left">
                                <div className="status-avatar" style={{ backgroundColor: '#e0e0e0' }}></div>
                                <div className="status-info">
                                    <span className="status-name">이름</span>
                                    <span className="status-label">오프라인</span>
                                </div>
                            </div>
                            <span className="status-time">00:00</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FocusMode;

