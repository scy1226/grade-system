import React, { useState } from 'react';

function DebugTest() {
  const [studentId, setStudentId] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('🧪 测试登录:', studentId);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: studentId }),
      });
      
      const data = await response.json();
      console.log('🧪 API响应:', data);
      setApiResponse(data);
      
    } catch (error) {
      console.error('🧪 测试失败:', error);
      setApiResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🧪 后端API调试工具</h1>
      
      <form onSubmit={testLogin} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="输入学号测试 (admin, T001, 2025001)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? '测试中...' : '测试登录'}
        </button>
      </form>

      {apiResponse && (
        <div style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #ddd'
        }}>
          <h3>API响应:</h3>
          <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          
          {apiResponse.success && (
            <div style={{ marginTop: '15px' }}>
              <h4>用户类型分析:</h4>
              <p><strong>userType:</strong> {apiResponse.user.userType}</p>
              <p><strong>识别依据:</strong></p>
              <ul>
                <li>role: {apiResponse.user.role || 'undefined'}</li>
                <li>class: {apiResponse.user.class || 'undefined'}</li>
              </ul>
              <p style={{ 
                color: apiResponse.user.userType === 'admin' ? 'green' : 'orange',
                fontWeight: 'bold'
              }}>
                {apiResponse.user.userType === 'admin' 
                  ? '✅ 识别为管理员' 
                  : '❌ 识别为学生'}
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>测试账号建议:</h3>
        <ul>
          <li><strong>admin</strong> - 应该识别为管理员</li>
          <li><strong>T001</strong> - 应该识别为管理员</li>
          <li><strong>2025001</strong> - 应该识别为学生</li>
        </ul>
      </div>
    </div>
  );
}

export default DebugTest;