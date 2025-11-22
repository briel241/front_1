// API 호출 유틸리티
// 백엔드 API 엔드포인트 기본 URL (환경변수나 설정에서 가져올 수 있음)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.coordin8.o-r.kr/api/v1';
const SESSION_API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.coordin8.o-r.kr/api';

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
 * 포커스 세션 생성
 * POST /api/session - FocusSessionRequestDto 형식으로 데이터 전송
 * @param {Object} sessionData - 세션 데이터 (FocusSessionRequestDto)
 * @param {number} sessionData.projectId - 프로젝트 ID
 * @param {number} sessionData.userId - 사용자 ID
 * @param {string} sessionData.sessionType - 세션 타입 (예: "FOCUS")
 * @param {string} sessionData.startTime - 시작 시간 (ISO 8601 형식)
 * @param {string} sessionData.endTime - 종료 시간 (ISO 8601 형식)
 * @returns {Promise<Object>} 서버 응답 (FocusSessionResponseDto)
 */
export async function createFocusSession(sessionData) {
    try {
        const url = `${SESSION_API_BASE_URL}/session`;
        console.log('포커스 세션 생성 API 호출:', url);
        
        // FocusSessionRequestDto 형식으로 데이터 구성
        const requestBody = {
            projectId: sessionData.projectId,
            userId: sessionData.userId,
            sessionType: sessionData.sessionType,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime
        };
        
        console.log('세션 데이터 (FocusSessionRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('포커스 세션 생성 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('포커스 세션 생성 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('포커스 세션 생성 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('포커스 세션 생성 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 포커스 세션 종료
 * @param {number|string} sessionId - 세션 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function endFocusSession(sessionId) {
    try {
        const url = `${SESSION_API_BASE_URL}/session/${sessionId}/end`;
        console.log('포커스 세션 종료 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('포커스 세션 종료 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('포커스 세션 종료 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('포커스 세션 종료 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('포커스 세션 종료 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사용자별 세션 조회 (누적 시간 계산용)
 * @param {number|string} userId - 사용자 ID
 * @returns {Promise<Object>} 세션 목록
 */
export async function getUserSessions(userId) {
    try {
        const url = `${SESSION_API_BASE_URL}/session/user/${userId}`;
        console.log('사용자별 세션 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('사용자별 세션 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('사용자별 세션 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('사용자별 세션 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('사용자별 세션 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트별 세션 조회
 * @param {number|string} projectId - 프로젝트 ID
 * @returns {Promise<Object>} 세션 목록
 */
export async function getProjectSessions(projectId) {
    try {
        const url = `${SESSION_API_BASE_URL}/session/project/${projectId}`;
        console.log('프로젝트별 세션 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('프로젝트별 세션 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트별 세션 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트별 세션 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트별 세션 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사용자의 총 집중 시간 계산 (모든 프로젝트의 누적 시간 합산)
 * @param {number|string} userId - 사용자 ID
 * @returns {Promise<number>} 총 집중 시간 (초 단위)
 */
export async function getTotalFocusTime(userId) {
    try {
        const result = await getUserSessions(userId);
        
        if (result.success && result.data) {
            const sessions = Array.isArray(result.data) ? result.data : [];
            // 모든 세션의 durationSeconds를 합산
            const totalSeconds = sessions.reduce((sum, session) => {
                return sum + (session.durationSeconds || 0);
            }, 0);
            
            console.log('총 집중 시간 계산:', totalSeconds, '초');
            return { success: true, totalSeconds };
        } else {
            return { success: false, totalSeconds: 0, error: result.error };
        }
    } catch (error) {
        console.error('총 집중 시간 계산 실패:', error);
        return { success: false, totalSeconds: 0, error: error.message };
    }
}

/**
 * 모든 사용자 조회
 * GET /api/v1/users - 백엔드가 프론트엔드에서 사용자 목록을 읽을 수 있도록 함
 * @returns {Promise<Object>} 사용자 목록 (UserResponseDto[])
 */
export async function getUsers() {
    try {
        const url = `${API_BASE_URL}/users`;
        console.log('사용자 전체 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('사용자 전체 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('사용자 전체 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('사용자 전체 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('사용자 전체 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 특정 사용자 조회
 * GET /api/v1/users/{id} - 백엔드가 프론트엔드에서 특정 사용자 정보를 읽을 수 있도록 함
 * @param {number|string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 정보 (UserResponseDto)
 */
export async function getUser(userId) {
    try {
        const url = `${API_BASE_URL}/users/${userId}`;
        console.log('특정 사용자 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('특정 사용자 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('특정 사용자 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('특정 사용자 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('사용자 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사용자 생성
 * POST /api/v1/users - UserRequestDto 형식으로 데이터 전송
 * @param {Object} userData - 사용자 데이터 (UserRequestDto)
 * @param {number} [userData.id] - 사용자 ID (선택사항)
 * @param {string} userData.userName - 사용자 이름
 * @param {string} userData.userMajor - 사용자 전공
 * @param {string} userData.bio - 사용자 소개
 * @param {number} userData.avatarId - 아바타 ID
 * @returns {Promise<Object>} 서버 응답 (UserResponseDto)
 */
export async function createUser(userData) {
    try {
        const url = `${API_BASE_URL}/users`;
        console.log('사용자 생성 API 호출:', url);
        
        // UserRequestDto 형식으로 데이터 구성
        const requestBody = {
            ...(userData.id && { id: userData.id }),
            userName: userData.userName,
            userMajor: userData.userMajor,
            bio: userData.bio,
            avatarId: userData.avatarId
        };
        
        console.log('사용자 데이터 (UserRequestDto):', requestBody);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('사용자 생성 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('사용자 생성 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('사용자 생성 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('사용자 생성 실패:', error);
        console.error('에러 상세:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return { success: false, error: error.message };
    }
}

/**
 * 사용자 수정
 * PUT /api/v1/users/{id} - UserRequestDto 형식으로 데이터 전송
 * @param {number|string} userId - 사용자 ID
 * @param {Object} userData - 사용자 데이터 (UserRequestDto)
 * @param {string} userData.userName - 사용자 이름
 * @param {string} userData.userMajor - 사용자 전공
 * @param {string} userData.bio - 사용자 소개
 * @param {number} userData.avatarId - 아바타 ID
 * @returns {Promise<Object>} 서버 응답 (UserResponseDto)
 */
export async function updateUser(userId, userData) {
    try {
        const url = `${API_BASE_URL}/users/${userId}`;
        console.log('사용자 수정 API 호출:', url);
        
        // UserRequestDto 형식으로 데이터 구성
        const requestBody = {
            userName: userData.userName,
            userMajor: userData.userMajor,
            bio: userData.bio,
            avatarId: userData.avatarId
        };
        
        console.log('사용자 데이터 (UserRequestDto):', requestBody);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('사용자 수정 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('사용자 수정 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('사용자 수정 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('사용자 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사용자 삭제
 * DELETE /api/v1/users/{id}
 * @param {number|string} userId - 사용자 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function deleteUser(userId) {
    try {
        const url = `${API_BASE_URL}/users/${userId}`;
        console.log('사용자 삭제 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('사용자 삭제 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('사용자 삭제 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // DELETE 요청은 응답 본문이 없을 수 있음
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        
        console.log('사용자 삭제 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('사용자 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사용자 생성 또는 업데이트 (하위 호환성을 위한 래퍼 함수)
 * @param {Object} userData - 사용자 데이터
 * @param {number} [userData.id] - 사용자 ID (업데이트 시 필요)
 * @param {string} userData.userName - 사용자 이름
 * @param {string} userData.userMajor - 사용자 전공
 * @param {string} userData.bio - 사용자 소개
 * @param {number} userData.avatarId - 아바타 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function createOrUpdateUser(userData) {
    if (userData.id) {
        // id가 있으면 업데이트
        const { id, ...updateData } = userData;
        return await updateUser(id, updateData);
    } else {
        // id가 없으면 생성
        return await createUser(userData);
    }
}

/**
 * 모든 프로젝트 멤버 조회
 * GET /api/v1/project-members - 백엔드가 프론트엔드에서 프로젝트 멤버 목록을 읽을 수 있도록 함
 * @returns {Promise<Object>} 프로젝트 멤버 목록 (ProjectMemberResponseDto[])
 */
export async function getProjectMembers() {
    try {
        const url = `${API_BASE_URL}/project-members`;
        console.log('프로젝트 멤버 전체 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('프로젝트 멤버 전체 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프로젝트 멤버 전체 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('프로젝트 멤버 전체 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 전체 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 특정 프로젝트 멤버 조회
 * GET /api/v1/project-members/{id} - 백엔드가 프론트엔드에서 특정 프로젝트 멤버 정보를 읽을 수 있도록 함
 * @param {number|string} memberId - 프로젝트 멤버 ID
 * @returns {Promise<Object>} 프로젝트 멤버 정보 (ProjectMemberResponseDto)
 */
export async function getProjectMember(memberId) {
    try {
        const url = `${API_BASE_URL}/project-members/${memberId}`;
        console.log('특정 프로젝트 멤버 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('특정 프로젝트 멤버 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('특정 프로젝트 멤버 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('특정 프로젝트 멤버 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('프로젝트 멤버 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 멤버 생성
 * POST /api/v1/project-members - ProjectMemberRequestDto 형식으로 데이터 전송
 * @param {Object} memberData - 프로젝트 멤버 데이터 (ProjectMemberRequestDto)
 * @param {number} [memberData.id] - 프로젝트 멤버 ID (선택사항)
 * @param {number} memberData.projectId - 프로젝트 ID
 * @param {number} memberData.userId - 사용자 ID
 * @param {number} memberData.roleId - 역할 ID
 * @returns {Promise<Object>} 서버 응답 (ProjectMemberResponseDto)
 */
export async function createProjectMember(memberData) {
    try {
        const url = `${API_BASE_URL}/project-members`;
        console.log('프로젝트 멤버 생성 API 호출:', url);
        
        // ProjectMemberRequestDto 형식으로 데이터 구성
        const requestBody = {
            ...(memberData.id && { id: memberData.id }),
            projectId: memberData.projectId,
            userId: memberData.userId,
            roleId: memberData.roleId
        };
        
        console.log('프로젝트 멤버 데이터 (ProjectMemberRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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
 * PUT /api/v1/project-members/{id} - ProjectMemberRequestDto 형식으로 데이터 전송
 * @param {number|string} memberId - 프로젝트 멤버 ID
 * @param {Object} memberData - 프로젝트 멤버 데이터 (ProjectMemberRequestDto)
 * @param {number} [memberData.id] - 프로젝트 멤버 ID (선택사항, URL 파라미터와 동일)
 * @param {number} memberData.projectId - 프로젝트 ID
 * @param {number} memberData.userId - 사용자 ID
 * @param {number} memberData.roleId - 역할 ID
 * @returns {Promise<Object>} 서버 응답 (ProjectMemberResponseDto)
 */
export async function updateProjectMember(memberId, memberData) {
    try {
        const url = `${API_BASE_URL}/project-members/${memberId}`;
        console.log('프로젝트 멤버 수정 API 호출:', url);
        
        // ProjectMemberRequestDto 형식으로 데이터 구성
        const requestBody = {
            ...(memberData.id && { id: memberData.id }),
            projectId: memberData.projectId,
            userId: memberData.userId,
            roleId: memberData.roleId
        };
        
        console.log('프로젝트 멤버 데이터 (ProjectMemberRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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
 * DELETE /api/v1/project-members/{id}
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
 * GET /api/v1/projects - 백엔드가 프론트엔드에서 프로젝트 목록을 읽을 수 있도록 함
 * @returns {Promise<Object>} 프로젝트 목록 (ProjectResponseDto[])
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
 * GET /api/v1/projects/{id} - 백엔드가 프론트엔드에서 프로젝트 정보를 읽을 수 있도록 함
 * @param {number|string} projectId - 프로젝트 ID
 * @returns {Promise<Object>} 프로젝트 정보 (ProjectResponseDto)
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

        console.log('프로젝트 조회 API 응답 상태:', response.status, response.statusText);

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
 * POST /api/v1/projects - ProjectRequestDto 형식으로 데이터 전송
 * @param {Object} projectData - 프로젝트 데이터 (ProjectRequestDto)
 * @param {number} [projectData.id] - 프로젝트 ID (선택사항)
 * @param {string} projectData.projectName - 프로젝트 이름
 * @param {string} projectData.projectGoal - 프로젝트 목표
 * @param {string} projectData.deadline - 마감일 (YYYY-MM-DD 형식)
 * @param {string} projectData.code - 팀 코드
 * @returns {Promise<Object>} 서버 응답 (ProjectResponseDto)
 */
export async function createProject(projectData) {
    try {
        const url = `${API_BASE_URL}/projects`;
        console.log('프로젝트 생성 API 호출:', url);
        
        // ProjectRequestDto 형식으로 데이터 구성
        const requestBody = {
            ...(projectData.id && { id: projectData.id }),
            projectName: projectData.projectName,
            projectGoal: projectData.projectGoal,
            deadline: projectData.deadline,
            code: projectData.code
        };
        
        console.log('프로젝트 데이터 (ProjectRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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
 * PUT /api/v1/projects/{id} - ProjectRequestDto 형식으로 데이터 전송
 * @param {number|string} projectId - 프로젝트 ID
 * @param {Object} projectData - 프로젝트 데이터 (ProjectRequestDto)
 * @param {number} [projectData.id] - 프로젝트 ID (선택사항, URL 파라미터와 동일)
 * @param {string} projectData.projectName - 프로젝트 이름
 * @param {string} projectData.projectGoal - 프로젝트 목표
 * @param {string} projectData.deadline - 마감일 (YYYY-MM-DD 형식)
 * @param {string} projectData.code - 팀 코드
 * @returns {Promise<Object>} 서버 응답 (ProjectResponseDto)
 */
export async function updateProject(projectId, projectData) {
    try {
        const url = `${API_BASE_URL}/projects/${projectId}`;
        console.log('프로젝트 수정 API 호출:', url);
        
        // ProjectRequestDto 형식으로 데이터 구성
        const requestBody = {
            ...(projectData.id && { id: projectData.id }),
            projectName: projectData.projectName,
            projectGoal: projectData.projectGoal,
            deadline: projectData.deadline,
            code: projectData.code
        };
        
        console.log('프로젝트 데이터 (ProjectRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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

/**
 * 모든 카드 조회
 * GET /api/v1/cards - 백엔드가 프론트엔드에서 카드 목록을 읽을 수 있도록 함
 * @returns {Promise<Object>} 카드 목록 (CardResponseDto[])
 */
export async function getCards() {
    try {
        const url = `${API_BASE_URL}/cards`;
        console.log('카드 전체 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('카드 전체 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('카드 전체 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('카드 전체 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('카드 전체 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 특정 카드 조회
 * GET /api/v1/cards/{id} - 백엔드가 프론트엔드에서 특정 카드 정보를 읽을 수 있도록 함
 * @param {number|string} cardId - 카드 ID
 * @returns {Promise<Object>} 카드 정보 (CardResponseDto)
 */
export async function getCard(cardId) {
    try {
        const url = `${API_BASE_URL}/cards/${cardId}`;
        console.log('카드 단일 조회 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('카드 단일 조회 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('카드 단일 조회 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('카드 단일 조회 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('카드 조회 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 카드 생성
 * POST /api/v1/cards - CardRequestDto 형식으로 데이터 전송
 * @param {Object} cardData - 카드 데이터 (CardRequestDto)
 * @param {string} cardData.cardTitle - 카드 제목
 * @param {string} cardData.cardContent - 카드 내용
 * @param {number} cardData.projectId - 프로젝트 ID
 * @param {number} cardData.userId - 사용자 ID
 * @param {string} [cardData.cardDate] - 카드 날짜 (ISO 8601 형식, 선택사항)
 * @returns {Promise<Object>} 서버 응답 (CardResponseDto)
 */
export async function createCard(cardData) {
    try {
        const url = `${API_BASE_URL}/cards`;
        console.log('카드 생성 API 호출:', url);
        
        // CardRequestDto 형식으로 데이터 구성
        const requestBody = {
            cardTitle: cardData.cardTitle,
            cardContent: cardData.cardContent,
            projectId: cardData.projectId,
            userId: cardData.userId,
            ...(cardData.cardDate && { cardDate: cardData.cardDate })
        };
        
        console.log('카드 데이터 (CardRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('카드 생성 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('카드 생성 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('카드 생성 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('카드 생성 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 카드 수정
 * PUT /api/v1/cards/{id} - CardRequestDto 형식으로 데이터 전송
 * @param {number|string} cardId - 카드 ID
 * @param {Object} cardData - 카드 데이터 (CardRequestDto)
 * @param {string} cardData.cardTitle - 카드 제목
 * @param {string} cardData.cardContent - 카드 내용
 * @param {number} cardData.projectId - 프로젝트 ID
 * @param {number} cardData.userId - 사용자 ID
 * @param {string} [cardData.cardDate] - 카드 날짜 (ISO 8601 형식, 선택사항)
 * @returns {Promise<Object>} 서버 응답 (CardResponseDto)
 */
export async function updateCard(cardId, cardData) {
    try {
        const url = `${API_BASE_URL}/cards/${cardId}`;
        console.log('카드 수정 API 호출:', url);
        
        // CardRequestDto 형식으로 데이터 구성
        const requestBody = {
            cardTitle: cardData.cardTitle,
            cardContent: cardData.cardContent,
            projectId: cardData.projectId,
            userId: cardData.userId,
            ...(cardData.cardDate && { cardDate: cardData.cardDate })
        };
        
        console.log('카드 데이터 (CardRequestDto):', requestBody);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('카드 수정 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('카드 수정 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('카드 수정 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('카드 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 카드 삭제
 * DELETE /api/v1/cards/{id}
 * @param {number|string} cardId - 카드 ID
 * @returns {Promise<Object>} 서버 응답
 */
export async function deleteCard(cardId) {
    try {
        const url = `${API_BASE_URL}/cards/${cardId}`;
        console.log('카드 삭제 API 호출:', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('카드 삭제 API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('카드 삭제 API 에러 응답:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // DELETE 요청은 응답 본문이 없을 수 있음
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        
        console.log('카드 삭제 API 응답 데이터:', data);
        return { success: true, data };
    } catch (error) {
        console.error('카드 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

