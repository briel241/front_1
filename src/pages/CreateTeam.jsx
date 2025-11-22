import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Projects } from '../utils/projects';
import { Storage } from '../utils/storage';
import { generateTeamCode } from '../utils/helpers';
import { createProject, createProjectMember } from '../utils/api';
import Logo from '../components/Logo';
import backIcon from '../assets/back.png';

function CreateTeam() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [goal, setGoal] = useState('');
    const [deadline, setDeadline] = useState('');
    const [teamCode, setTeamCode] = useState('');

    const handleGenerateCode = () => {
        setTeamCode(generateTeamCode());
    };

    const createTeam = async () => {
        if (!title.trim()) {
            alert('프로젝트 제목을 입력해주세요.');
            return;
        }

        const code = teamCode || generateTeamCode();
        const userId = Storage.get('userId');
        
        // 백엔드에 프로젝트 생성
        let backendProjectId = null;
        try {
            const projectData = {
                projectName: title.trim(),
                projectGoal: goal.trim(),
                deadline: deadline || null,
                code: code
            };
            
            const projectResult = await createProject(projectData);
            if (projectResult.success && projectResult.data) {
                backendProjectId = projectResult.data.id;
                console.log('프로젝트가 백엔드에 생성되었습니다:', projectResult.data);
            } else {
                console.error('프로젝트 생성 실패:', projectResult.error);
            }
        } catch (error) {
            console.error('프로젝트 생성 중 오류:', error);
        }

        // 로컬 스토리지에 프로젝트 추가
        const project = {
            title: title.trim(),
            goal: goal.trim(),
            deadline,
            code,
            isActive: true,
            members: [],
            nextMeeting: null,
            ...(backendProjectId && { backendId: backendProjectId }) // 백엔드 ID 저장
        };

        const addedProjects = Projects.add(project);
        const createdProject = addedProjects[addedProjects.length - 1];
        
        // 백엔드에 프로젝트 멤버 생성 (팀장)
        if (userId && backendProjectId) {
            try {
                // roleId: 1 = 팀장 (리더)
                const memberData = {
                    projectId: backendProjectId,
                    userId: parseInt(userId) || userId,
                    roleId: 1 // 팀장 역할
                };
                
                const memberResult = await createProjectMember(memberData);
                if (memberResult.success) {
                    console.log('프로젝트 멤버가 백엔드에 생성되었습니다:', memberResult.data);
                } else {
                    console.error('프로젝트 멤버 생성 실패:', memberResult.error);
                }
            } catch (error) {
                console.error('프로젝트 멤버 생성 중 오류:', error);
            }
        } else {
            console.warn('userId 또는 projectId가 없어 백엔드에 프로젝트 멤버를 생성할 수 없습니다.');
        }

        alert('팀이 생성되었습니다!');
        navigate('/home');
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
            <div className="content">
                <div className="tabs">
                    <button className="tab active" onClick={() => navigate('/create-team')}>
                        새 팀 만들기
                    </button>
                    <button className="tab" onClick={() => navigate('/join-team')}>
                        팀 참여하기
                    </button>
                </div>
                <div className="form-container">
                    <div className="input-group">
                        <label>프로젝트 제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="프로젝트를 입력하세요"
                            className="input-white"
                        />
                    </div>
                    <div className="input-group">
                        <label>프로젝트 목표</label>
                        <textarea
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="이 프로젝트를 통해 달성하고자 하는 목표를 입력하세요"
                            className="input-white"
                        ></textarea>
                    </div>
                    <div className="input-group">
                        <label>마감일</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="input-white date-input"
                        />
                    </div>
                    <div className="input-group">
                        <label>팀원 초대하기</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                            <div className="code-section-white" style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '25px', padding: '8px 16px' }}>
                                {teamCode ? (
                                    <div className="code-display">{teamCode}</div>
                                ) : (
                                    <span className="code-placeholder">코드 생성하기</span>
                                )}
                            </div>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleGenerateCode}
                                style={{ width: 'auto', padding: '8px 16px', fontSize: '14px', minHeight: '25px' }}
                            >
                                생성
                            </button>
                        </div>
                    </div>
                    <button className="btn btn-pink" onClick={createTeam} style={{ marginTop: '12px' }}>
                        팀 만들기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateTeam;

