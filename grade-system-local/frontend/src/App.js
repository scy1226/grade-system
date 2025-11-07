// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import AdminPanel from './AdminPanel';

function App() {
  const [user, setUser] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      console.log('🔍 从本地存储恢复用户:', parsedUser);
      setUser(parsedUser);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔍 开始登录，学号:', studentId);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: studentId }),
      });

      const data = await response.json();
      console.log('🔍 登录API响应:', data);

      if (data.success) {
        console.log('✅ 登录成功，用户数据:', data.user);
        console.log('🔍 用户类型:', data.user.userType);
        
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // 如果是学生，获取成绩
        if (data.user.userType === 'student') {
          console.log('🎓 学生用户，获取成绩...');
          fetchGrades(data.user.student_id);
        } else {
          console.log('👨‍🏫 管理员用户，跳过成绩获取');
        }
      } else {
        console.error('❌ 登录失败:', data.error);
        alert('登录失败: ' + data.error);
      }
    } catch (error) {
      console.error('❌ 登录请求错误:', error);
      alert('登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (id) => {
    try {
      console.log('📊 获取成绩，学号:', id);
      const response = await fetch(`/api/grades/${id}`);
      const data = await response.json();
      console.log('📊 成绩数据:', data);
      setGrades(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ 获取成绩失败:', error);
      setGrades([]);
    }
  };

  const handleLogout = () => {
    console.log('🚪 用户退出登录');
    setUser(null);
    setStudentId('');
    setGrades([]);
    localStorage.removeItem('user');
  };

  // 调试信息：当前用户状态
  console.log('🔍 当前用户状态:', user);
  console.log('🔍 用户类型:', user?.userType);

  // 如果是管理员，显示管理员面板
  if (user && user.userType === 'admin') {
    console.log('🎯 渲染管理员面板');
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  // 登录页面
  if (!user) {
    console.log('🎯 渲染登录页面');
    return (
      <div className="App">
        <div className="login-container">
          <h1>学生成绩查询系统</h1>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="请输入学号/教师号"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <div className="demo-accounts">
            <h3>测试账号：</h3>
            <p>学生: 2025001, 2025002</p>
            <p>教师/管理员: admin, T001</p>
            <p style={{color: '#e74c3c', fontSize: '12px', marginTop: '10px'}}>
              💡 提示: 按F12打开开发者工具查看调试信息
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 学生成绩查询页面
  console.log('🎯 渲染学生页面');
  return (
    <div className="App">
      <div className="student-container">
        <div className="student-header">
          <h1>学生成绩查询</h1>
          <div className="user-info">
            <span>欢迎，{user.name} ({user.class}) - 类型: {user.userType}</span>
            <button onClick={handleLogout} className="logout-btn">退出</button>
          </div>
        </div>

        <div className="grades-section">
          <h2>我的成绩</h2>
          {grades.length > 0 ? (
            <div className="grades-list">
              {grades.map((grade, index) => (
                <div key={index} className="grade-item">
                  <div className="course-name">{grade.course}</div>
                  <div className={`grade-score ${grade.score >= 90 ? 'excellent' : grade.score >= 60 ? 'good' : 'poor'}`}>
                    {grade.score} 分
                  </div>
                  <div className="grade-semester">{grade.semester}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-grades">暂无成绩数据或不在查询时间内</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;