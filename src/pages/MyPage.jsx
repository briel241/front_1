import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Projects } from '../utils/projects';
import { Cards } from '../utils/cards';
import { Storage } from '../utils/storage';
import { getUser, createOrUpdateUser } from '../utils/api';
import Logo from '../components/Logo';
import backIcon from '../assets/back.png';
import cr01 from '../assets/cr01.png';
import cr02 from '../assets/cr02.png';
import cr03 from '../assets/cr03.png';
import cr04 from '../assets/cr04.png';
import cr05 from '../assets/cr05.png';
import cr06 from '../assets/cr06.png';
import cr07 from '../assets/cr07.png';
import cr08 from '../assets/cr08.png';

function MyPage() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({
        teams: 0,
        cards: 0,
        members: 0,
        focusTime: '00:00'
    });
    const [projects, setProjects] = useState([]);
    
    // 캐릭터 이미지 배열
    const characterImages = [cr01, cr02, cr03, cr04, cr05, cr06, cr07, cr08];

    useEffect(() => {
        const userId = Storage.get('userId');
        if (userId) {
            // 백엔드에서 사용자 정보 조회
            loadUserData(userId);
        } else {
            // userId가 없으면 로컬 프로필 확인
            const userProfile = Storage.get('userProfile');
            if (!userProfile) {
                navigate('/');
                return;
            }
            setProfile(userProfile);
            loadData();
        }
    }, [navigate]);

    const loadUserData = async (userId) => {
        try {
            const result = await getUser(userId);
            
            if (result.success && result.data) {
                const userData = result.data;
                
                // 프로필 정보 설정
                const profileData = {
                    id: userData.id,
                    name: userData.userName,
                    major: userData.userMajor,
                    intro: userData.bio,
                    character: userData.avatarId
                };
                setProfile(profileData);
                
                // 로컬 스토리지에도 저장 (기존 호환성 유지)
                Storage.set('userProfile', profileData);
                Storage.set('userId', userData.id);
            } else {
                // 백엔드 조회 실패 시 로컬 데이터 사용
                const userProfile = Storage.get('userProfile');
                if (userProfile) {
                    setProfile(userProfile);
                } else {
                    navigate('/');
                }
            }
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
            // 에러 발생 시 로컬 데이터 사용
            const userProfile = Storage.get('userProfile');
            if (userProfile) {
                setProfile(userProfile);
            }
        }
        
        loadData();
    };

    const loadData = () => {
        const allProjects = Projects.getAll();
        const allCards = Cards.getAll();
        const totalMembers = allProjects.reduce((sum, p) => sum + (p.members?.length || 0), 0);
        const focusTime = Storage.get('totalFocusTime') || 0;
        const hours = Math.floor(focusTime / 3600);
        const minutes = Math.floor((focusTime % 3600) / 60);

        setStats({
            teams: allProjects.length,
            cards: allCards.length,
            members: totalMembers,
            focusTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        });
        setProjects(allProjects);
    };

    const editProfile = async () => {
        if (!profile) return;

        const name = prompt('이름을 입력하세요:', profile.name);
        if (name === null) return;

        const major = prompt('전공을 입력하세요:', profile.major);
        if (major === null) return;

        const intro = prompt('한줄 소개를 입력하세요:', profile.intro);
        if (intro === null) return;

        // 프로젝트 수와 카드 수 계산
        const allProjects = Projects.getAll();
        const allCards = Cards.getAll();
        const projectCount = allProjects.length;
        const cardCount = allCards.length;

        const userId = Storage.get('userId') || profile.id;
        const avatarId = profile.character || 1;

        // 백엔드에 업데이트
        const userData = {
            ...(userId && { id: userId }),
            userName: name.trim() || profile.name,
            userMajor: major.trim() || profile.major,
            bio: intro.trim() || profile.intro,
            avatarId: avatarId,
            projectCount: projectCount,
            cardCount: cardCount
        };

        const result = await createOrUpdateUser(userData);

        if (result.success) {
            // 백엔드에서 받은 사용자 ID 저장
            if (result.data && result.data.id) {
                Storage.set('userId', result.data.id);
            }

            // 로컬 프로필 업데이트
            const updatedProfile = {
                ...profile,
                id: result.data?.id || userId,
                name: name.trim() || profile.name,
                major: major.trim() || profile.major,
                intro: intro.trim() || profile.intro
            };
            Storage.set('userProfile', updatedProfile);
            setProfile(updatedProfile);
        } else {
            console.error('프로필 수정 실패:', result.error);
            // 백엔드 업데이트 실패해도 로컬은 업데이트
            const updatedProfile = {
                ...profile,
                name: name.trim() || profile.name,
                major: major.trim() || profile.major,
                intro: intro.trim() || profile.intro
            };
            Storage.set('userProfile', updatedProfile);
            setProfile(updatedProfile);
        }
    };

    if (!profile) return null;

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
                <div className="user-icon"></div>
            </div>
            <div className="content">
                <div className="profile-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        {profile.characterImage ? (
                            <img 
                                src={profile.characterImage} 
                                alt="프로필 캐릭터" 
                                style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    borderRadius: '50%', 
                                    objectFit: 'cover',
                                    border: '2px solid #E26D59'
                                }} 
                            />
                        ) : profile.character ? (
                            <img 
                                src={characterImages[profile.character - 1] || characterImages[0]} 
                                alt="프로필 캐릭터" 
                                style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    borderRadius: '50%', 
                                    objectFit: 'cover',
                                    border: '2px solid #E26D59'
                                }} 
                            />
                        ) : (
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#E26D59' }}></div>
                        )}
                        <div style={{ flex: 1 }}>
                            <div className="profile-value">{profile.name || '이름'}</div>
                            <div className="profile-major">{profile.major || '전공'}</div>
                        </div>
                        <button className="btn btn-write btn-small" onClick={editProfile}>
                            수정
                        </button>
                    </div>
                    <div className="profile-intro-box">
                        <div className="profile-label">한줄 소개</div>
                        <div className="profile-value">{profile.intro || '한줄 소개'}</div>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-item" style={{ backgroundColor: '#FFE7E0' }}>
                        <div className="stat-value">{stats.teams}</div>
                        <div className="stat-label">참여 팀</div>
                    </div>
                    <div className="stat-item" style={{ backgroundColor: '#Ffd3df' }}>
                        <div className="stat-value">{stats.cards}</div>
                        <div className="stat-label">작성 카드</div>
                    </div>
                    <div className="stat-item" style={{ backgroundColor: '#FFFCE6' }}>
                        <div className="stat-value">{stats.members}</div>
                        <div className="stat-label">끝난 프로젝트</div>
                    </div>
                </div>

                <div className="teams-section">
                    <h2 className="teams-section-title">참여 중인 팀</h2>
                    {projects.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94846B', padding: '20px' }}>
                            참여 중인 팀이 없습니다.
                        </p>
                    ) : (
                        <div className="teams-list">
                            {projects.map((project) => (
                                <div key={project.id} className="team-item-box">
                                    <div className="team-project-name">{project.title}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="focus-time-section">
                    <div className="focus-time-label">총 집중 시간</div>
                    <div className="focus-time-display">{stats.focusTime}</div>
                </div>
            </div>
        </div>
    );
}

export default MyPage;

