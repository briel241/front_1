import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Projects } from '../utils/projects';
import { Storage } from '../utils/storage';
import { getProjects, createProjectMember } from '../utils/api';
import Logo from '../components/Logo';
import backIcon from '../assets/back.png';

function JoinTeam() {
    const navigate = useNavigate();
    const [code, setCode] = useState('');

    const joinTeam = async () => {
        const teamCode = code.trim().toUpperCase();

        if (!teamCode || teamCode.length !== 6) {
            alert('6자리 팀 코드를 입력해주세요.');
            return;
        }

        // 먼저 백엔드에서 프로젝트 조회
        let backendProject = null;
        try {
            const projectsResult = await getProjects();
            if (projectsResult.success && projectsResult.data) {
                const projects = Array.isArray(projectsResult.data) ? projectsResult.data : [];
                backendProject = projects.find((p) => p.code === teamCode);
            }
        } catch (error) {
            console.error('백엔드에서 프로젝트 조회 실패:', error);
        }

        // 로컬 스토리지에서도 프로젝트 찾기
        const localProjects = Projects.getAll();
        const localProject = localProjects.find((p) => p.code === teamCode);

        // 백엔드 또는 로컬에서 프로젝트를 찾지 못한 경우
        if (!backendProject && !localProject) {
            alert('유효하지 않은 팀 코드입니다.');
            return;
        }

        const profile = Storage.get('userProfile');
        const userId = Storage.get('userId');
        
        // 백엔드 프로젝트가 있으면 백엔드에 멤버 추가
        let projectId = null;
        if (backendProject) {
            projectId = backendProject.id;
        } else if (localProject && localProject.backendId) {
            projectId = localProject.backendId;
        }

        // 로컬 스토리지에 멤버 추가 (로컬 프로젝트가 있는 경우)
        if (localProject && profile && localProject.members) {
            if (!localProject.members.find((m) => m.id === profile.name)) {
                localProject.members.push({
                    id: profile.name,
                    name: profile.name
                });
                Projects.update(localProject.id, { members: localProject.members });
            }
        }

        // 백엔드에 프로젝트 멤버 생성 (일반 멤버)
        if (userId && projectId) {
            try {
                // roleId: 2 = 일반 멤버
                const memberData = {
                    projectId: projectId,
                    userId: parseInt(userId) || userId,
                    roleId: 2 // 일반 멤버 역할
                };
                
                const result = await createProjectMember(memberData);
                if (result.success) {
                    console.log('프로젝트 멤버가 백엔드에 생성되었습니다:', result.data);
                } else {
                    console.error('프로젝트 멤버 생성 실패:', result.error);
                }
            } catch (error) {
                console.error('프로젝트 멤버 생성 중 오류:', error);
            }
        } else {
            console.warn('userId 또는 projectId가 없어 백엔드에 프로젝트 멤버를 생성할 수 없습니다.');
        }

        alert('팀에 참여했습니다!');
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
                    <button className="tab" onClick={() => navigate('/create-team')}>
                        새 팀 만들기
                    </button>
                    <button className="tab active" onClick={() => navigate('/join-team')}>
                        팀 참여하기
                    </button>
                </div>
                <div className="form-container">
                    <div className="input-group">
                        <label>팀 코드 입력</label>
                        <div style={{ fontSize: '14px', color: '#94846B', marginBottom: '8px' }}>
                            팀장에게 받은 6자리 코드를 입력하세요
                        </div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="예 : ABC123"
                            maxLength={6}
                            style={{ textTransform: 'uppercase' }}
                            className="input-white"
                        />
                    </div>
                    <button className="btn btn-pink" onClick={joinTeam} style={{ width: '100%', marginTop: '16px' }}>
                        팀 참여하기
                    </button>
                    <div className="info-box-blue">
                        <p>팀 코드를 받지 못했나요?</p>
                        <p style={{ marginTop: '8px' }}>팀장에게 초대 링크나 코드를 요청하세요</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default JoinTeam;

