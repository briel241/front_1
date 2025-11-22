import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storage } from '../utils/storage';
import { Projects } from '../utils/projects';
import { Cards } from '../utils/cards';
import { createOrUpdateUser } from '../utils/api';
import Logo from '../components/Logo';
import cr01 from '../assets/cr01.png';
import cr02 from '../assets/cr02.png';
import cr03 from '../assets/cr03.png';
import cr04 from '../assets/cr04.png';
import cr05 from '../assets/cr05.png';
import cr06 from '../assets/cr06.png';
import cr07 from '../assets/cr07.png';
import cr08 from '../assets/cr08.png';

function Setup() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [major, setMajor] = useState('');
    const [intro, setIntro] = useState('');
    const [selectedCharacter, setSelectedCharacter] = useState(1);
    
    // 캐릭터 이미지 배열
    const characterImages = [cr01, cr02, cr03, cr04, cr05, cr06, cr07, cr08];

    const selectCharacter = (charNum) => {
        setSelectedCharacter(charNum);
    };

    const saveSetup = async () => {
        if (!name.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }

        // 프로젝트 수와 카드 수 계산
        const allProjects = Projects.getAll();
        const allCards = Cards.getAll();
        const projectCount = allProjects.length;
        const cardCount = allCards.length;

        // 기존 사용자 ID 확인
        const existingUserId = Storage.get('userId');
        const avatarId = selectedCharacter || 1;

        // 백엔드에 사용자 정보 전송
        const userData = {
            ...(existingUserId && { id: existingUserId }),
            userName: name.trim(),
            userMajor: major.trim(),
            bio: intro.trim(),
            avatarId: avatarId,
            projectCount: projectCount,
            cardCount: cardCount
        };

        const result = await createOrUpdateUser(userData);
        
        if (result.success) {
            // 백엔드에서 받은 사용자 ID 저장
            if (result.data && result.data.id) {
                Storage.set('userId', result.data.id);
            } else if (existingUserId) {
                Storage.set('userId', existingUserId);
            }
        } else {
            console.error('사용자 정보 저장 실패:', result.error);
        }

        // 로컬 스토리지에도 프로필 저장 (기존 호환성 유지)
        const profile = {
            name: name.trim(),
            major: major.trim(),
            intro: intro.trim(),
            character: avatarId,
            characterImage: characterImages[avatarId - 1] || characterImages[0]
        };
        Storage.set('userProfile', profile);
        navigate('/home');
    };

    return (
        <div className="container">
            <div className="header">
                <Logo 
                    style={{ height: '19px', width: 'auto', objectFit: 'contain' }}
                />
            </div>
            <div className="content" style={{ padding: '40px 60px' }}>
                <div className="input-group">
                    <label>이름을 작성해주세요</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름 입력"
                    />
                </div>
                <div className="input-group">
                    <label>당신의 전공은 무엇인가요?</label>
                    <input
                        type="text"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        placeholder="전공 입력"
                    />
                </div>
                <div className="input-group">
                    <label>나를 소개 하는 한 문장</label>
                    <input
                        type="text"
                        value={intro}
                        onChange={(e) => setIntro(e.target.value)}
                        placeholder="소개 입력"
                    />
                </div>
                <div className="input-group">
                    <label>나의 캐릭터</label>
                    <div className="character-selection">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((charNum) => (
                            <div
                                key={charNum}
                                className={`character-item ${selectedCharacter === charNum ? 'selected' : ''}`}
                                onClick={() => selectCharacter(charNum)}
                                style={{
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: selectedCharacter === charNum ? '3px solid #E26D59' : '3px solid transparent',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <img 
                                    src={characterImages[charNum - 1]} 
                                    alt={`캐릭터 ${charNum}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <button className="btn btn-black" onClick={saveSetup}>
                    지금 시작해요
                </button>
            </div>
        </div>
    );
}

export default Setup;

