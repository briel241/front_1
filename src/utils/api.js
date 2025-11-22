// API 호출 유틸리티
// 백엔드 API 엔드포인트 기본 URL (환경변수나 설정에서 가져올 수 있음)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://13.125.224.125:8080/api/v1';

// 디버깅: 현재 사용 중인 API URL 확인
console.log('API_BASE_URL:', API_BASE_URL);
console.log('VITE_API_URL 환경 변수:', import.meta.env.VITE_API_URL);

/**
 * 집중 세션 정보를 백엔드로 전송
 * @param {Object} sessionData - 세션 데이터
 * @param {string} sessionData.userId - 사용자 ID
 * @param {string} sessionData.projectId - 프로젝트 ID
 * @param {number} sessionData.focusSeconds - 집중한 시간 (초 단위)
 * @returns {Promise<Object>} 서버 응답
 */
export async function sendFocusSession(sessionData) {
    try {
        const response = await fetch(`${API_BASE_URL}/focus-sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('집중 세션 전송 실패:', error);
        // 오프라인 상태나 네트워크 오류 시 로컬 스토리지에 저장 (나중에 재전송 가능)
        saveSessionToQueue(sessionData);
        return { success: false, error: error.message };
    }
}

/**
 * 실패한 세션을 로컬 스토리지에 저장 (재전송 큐)
 * @param {Object} sessionData - 세션 데이터
 */
function saveSessionToQueue(sessionData) {
    try {
        const queue = JSON.parse(localStorage.getItem('focusSessionQueue') || '[]');
        queue.push({
            ...sessionData,
            timestamp: Date.now(),
        });
        localStorage.setItem('focusSessionQueue', JSON.stringify(queue));
        console.log('세션 정보를 재전송 큐에 저장했습니다.');
    } catch (error) {
        console.error('재전송 큐 저장 실패:', error);
    }
}

/**
 * 재전송 큐에 있는 세션들을 다시 전송 시도
 */
export async function retryFailedSessions() {
    try {
        const queue = JSON.parse(localStorage.getItem('focusSessionQueue') || '[]');
        if (queue.length === 0) return;

        const successful = [];
        const failed = [];

        for (const session of queue) {
            const result = await sendFocusSession(session);
            if (result.success) {
                successful.push(session);
            } else {
                failed.push(session);
            }
        }

        // 성공한 세션은 큐에서 제거
        if (successful.length > 0) {
            const remaining = queue.filter(
                (s) => !successful.some((success) => success.timestamp === s.timestamp)
            );
            localStorage.setItem('focusSessionQueue', JSON.stringify(remaining));
            console.log(`${successful.length}개의 세션을 성공적으로 재전송했습니다.`);
        }

        return { successful: successful.length, failed: failed.length };
    } catch (error) {
        console.error('재전송 실패:', error);
        return { successful: 0, failed: 0 };
    }
}

/**
 * 특정 사용자 조회
 * @param {number|string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 정보
 */
export async function getUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('사용자 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사용자 생성 또는 업데이트
 * @param {Object} userData - 사용자 데이터
 * @param {number} userData.id - 사용자 ID (업데이트 시 필요)
 * @param {string} userData.userName - 사용자 이름
 * @param {string} userData.userMajor - 사용자 전공
 * @param {string} userData.bio - 사용자 소개
 * @param {number} userData.avatarId - 아바타 ID
 * @param {number} userData.projectCount - 프로젝트 수
 * @param {number} userData.cardCount - 카드 수
 * @returns {Promise<Object>} 서버 응답
 */
export async function createOrUpdateUser(userData) {
    try {
        const method = userData.id ? 'PUT' : 'POST';
        const url = userData.id 
            ? `${API_BASE_URL}/users/${userData.id}`
            : `${API_BASE_URL}/users`;

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('사용자 생성/업데이트 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 모든 프로젝트 멤버 조회
 * @returns {Promise<Object>} 프로젝트 멤버 목록
 */
export async function getProjectMembers() {
    try {
        const url = `${API_BASE_URL}/project-members`;
        console.log('프로젝트 멤버 목록 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('프로젝트 멤버 목록 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 멤버 목록 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 멤버 목록 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 목록 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 특정 프로젝트 멤버 조회
 * @param {number|string} memberId - 프로젝트 멤버 ID
 * @returns {Promise<Object>} 프로젝트 멤버 정보
 */
export async function getProjectMember(memberId) {
    try {
        const url = `${API_BASE_URL}/project-members/${memberId}`;
        console.log('프로젝트 멤버 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 멤버 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 멤버 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 멤버 생성
 * @param {Object} memberData - 프로젝트 멤버 데이터
 * @param {number} memberData.projectId - 프로젝트 ID
 * @param {number} memberData.userId - 사용자 ID
 * @param {number} memberData.roleId - 역할 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function createProjectMember(memberData) {
    try {
        const url = `${API_BASE_URL}/project-members`;
        console.log('프로젝트 멤버 생성 API 호출:', url);
        console.log('프로젝트 멤버 데이터:', memberData);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData),
        });

        console.log('프로젝트 멤버 생성 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 멤버 생성 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 멤버 생성 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 생성 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 멤버 수정
 * @param {number|string} memberId - 프로젝트 멤버 ID
 * @param {Object} memberData - 프로젝트 멤버 데이터
 * @param {number} memberData.projectId - 프로젝트 ID
 * @param {number} memberData.userId - 사용자 ID
 * @param {number} memberData.roleId - 역할 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function updateProjectMember(memberId, memberData) {
    try {
        const url = `${API_BASE_URL}/project-members/${memberId}`;
        console.log('프로젝트 멤버 수정 API 호출:', url);
        console.log('프로젝트 멤버 데이터:', memberData);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData),
        });

        console.log('프로젝트 멤버 수정 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 멤버 수정 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 멤버 수정 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 멤버 삭제
 * @param {number|string} memberId - 프로젝트 멤버 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function deleteProjectMember(memberId) {
    try {
        const url = `${API_BASE_URL}/project-members/${memberId}`;
        console.log('프로젝트 멤버 삭제 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('프로젝트 멤버 삭제 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 멤버 삭제 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // DELETE 요청은 응답 본문이 없을 수 있음
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        
        console.log('프로젝트 멤버 삭제 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 모든 프로젝트 조회
 * @returns {Promise<Object>} 프로젝트 목록
 */
export async function getProjects() {
    try {
        const url = `${API_BASE_URL}/projects`;
        console.log('프로젝트 목록 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('프로젝트 목록 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 목록 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 목록 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 목록 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 특정 프로젝트 조회
 * @param {number|string} projectId - 프로젝트 ID
 * @returns {Promise<Object>} 프로젝트 정보
 */
export async function getProject(projectId) {
    try {
        const url = `${API_BASE_URL}/projects/${projectId}`;
        console.log('프로젝트 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 생성
 * @param {Object} projectData - 프로젝트 데이터
 * @param {string} projectData.projectName - 프로젝트 이름
 * @param {string} projectData.projectGoal - 프로젝트 목표
 * @param {string} projectData.deadline - 마감일 (YYYY-MM-DD 형식)
 * @param {string} projectData.code - 팀 코드
 * @returns {Promise<Object>} 서버 응답
 */
export async function createProject(projectData) {
    try {
        const url = `${API_BASE_URL}/projects`;
        console.log('프로젝트 생성 API 호출:', url);
        console.log('프로젝트 데이터:', projectData);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData),
        });

        console.log('프로젝트 생성 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 생성 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 생성 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 생성 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 수정
 * @param {number|string} projectId - 프로젝트 ID
 * @param {Object} projectData - 프로젝트 데이터
 * @param {string} projectData.projectName - 프로젝트 이름
 * @param {string} projectData.projectGoal - 프로젝트 목표
 * @param {string} projectData.deadline - 마감일 (YYYY-MM-DD 형식)
 * @param {string} projectData.code - 팀 코드
 * @returns {Promise<Object>} 서버 응답
 */
export async function updateProject(projectId, projectData) {
    try {
        const url = `${API_BASE_URL}/projects/${projectId}`;
        console.log('프로젝트 수정 API 호출:', url);
        console.log('프로젝트 데이터:', projectData);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData),
        });

        console.log('프로젝트 수정 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 수정 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 수정 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 삭제
 * @param {number|string} projectId - 프로젝트 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function deleteProject(projectId) {
    try {
        const url = `${API_BASE_URL}/projects/${projectId}`;
        console.log('프로젝트 삭제 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('프로젝트 삭제 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 삭제 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // DELETE 요청은 응답 본문이 없을 수 있음
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        
        console.log('프로젝트 삭제 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

