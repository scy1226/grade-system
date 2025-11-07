// frontend/src/AdminPanel.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './AdminPanel.css';

function AdminPanel({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newGrade, setNewGrade] = useState({
    student_id: '',
    course: '',
    score: '',
    semester: '2023-2'
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 获取所有学生
  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      console.log('🔍 开始获取学生列表...');
      const response = await fetch('http://localhost:5000/api/students');
      
      console.log('🔍 学生列表响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 获取学生列表完整响应:', data);
      
      if (data.success) {
        setStudents(data.data || []);
        setMessage(`成功加载 ${data.data.length} 名学生`);
        console.log('✅ 学生列表设置成功:', data.data);
      } else {
        setMessage('获取学生列表失败: ' + (data.error || '未知错误'));
        console.error('❌ 学生列表API返回失败:', data);
      }
    } catch (error) {
      console.error('获取学生列表错误:', error);
      setMessage('获取学生列表失败: ' + error.message);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // 获取所有成绩
  const fetchAllGrades = async () => {
    try {
      setLoading(true);
      console.log('🔍 开始获取所有成绩...');
      
      const response = await fetch('http://localhost:5000/api/admin/all-grades');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 获取所有成绩响应:', data);
      
      setGrades(Array.isArray(data) ? data : []);
      setMessage(`成功加载 ${Array.isArray(data) ? data.length : 0} 条成绩记录`);
      
    } catch (error) {
      console.error('获取成绩失败:', error);
      setMessage('获取成绩列表失败: ' + error.message);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAllGrades();
  }, []);

  // 处理Excel文件上传
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setMessage('请上传Excel文件 (.xlsx 或 .xls)');
      return;
    }

    setUploading(true);
    setMessage('正在解析Excel文件...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('🔍【Excel解析结果】:', jsonData);
        
        // 发送到后端进行进一步处理
        processExcelData(jsonData, file.name);
        
      } catch (error) {
        console.error('❌ Excel解析错误:', error);
        setMessage('Excel文件解析失败: ' + error.message);
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      setMessage('文件读取失败');
      setUploading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  // 处理Excel数据
  const processExcelData = async (data, fileName) => {
    try {
      setMessage('正在验证Excel数据...');
      
      const response = await fetch('http://localhost:5000/api/admin/upload-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${btoa(
            String.fromCharCode(...new Uint8Array(data))
          )}`,
          fileName: fileName
        }),
      });

      const result = await response.json();
      console.log('🔍【Excel处理响应】:', result);

      if (result.success) {
        setExcelData(result.data);
        setMessage(`Excel解析成功: ${result.data.length} 条记录`);
        if (result.errors && result.errors.length > 0) {
          setMessage(prev => prev + `，发现 ${result.errors.length} 个错误`);
          console.warn('Excel解析警告:', result.errors);
        }
      } else {
        setMessage('Excel处理失败: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Excel处理错误:', error);
      setMessage('Excel处理失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 批量上传成绩
  const handleBulkUpload = async () => {
    if (!excelData || excelData.length === 0) {
      setMessage('没有可上传的数据');
      return;
    }

    setUploading(true);
    setMessage('正在批量上传成绩...');

    try {
      const response = await fetch('http://localhost:5000/api/admin/bulk-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grades: excelData
        }),
      });

      const result = await response.json();
      console.log('🔍【批量上传响应】:', result);

      if (result.success) {
        setMessage(result.message);
        setExcelData(null);
        setShowUploadForm(false);
        fetchAllGrades(); // 刷新成绩列表
      } else {
        setMessage('批量上传失败: ' + result.error);
      }
    } catch (error) {
      console.error('❌ 批量上传错误:', error);
      setMessage('批量上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!newGrade.student_id) {
      setMessage('请选择学生');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 提交成绩数据:', newGrade);
      
      const response = await fetch('http://localhost:5000/api/admin/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: newGrade.student_id,
          course: newGrade.course,
          grade: newGrade.score,
          semester: newGrade.semester
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 添加成绩响应:', data);
      
      if (data.success) {
        setMessage('成绩添加成功！');
        setNewGrade({
          student_id: '',
          course: '',
          score: '',
          semester: '2023-2'
        });
        setShowAddForm(false);
        fetchAllGrades();
      } else {
        setMessage('添加失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('添加成绩失败:', error);
      setMessage('添加成绩失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewGrade({
      ...newGrade,
      [e.target.name]: e.target.value
    });
  };

  // 学期显示名称映射
  const semesterDisplayNames = {
    '2023-1': '2023-2024 第一学期',
    '2023-2': '2023-2024 第二学期',
    '2024-1': '2024-2025 第一学期',
    '2024-2': '2024-2025 第二学期'
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>管理员面板 - 欢迎，{user?.name || '教师'}</h1>
        <button onClick={onLogout} className="logout-btn">退出登录</button>
      </div>

      {message && (
        <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="admin-actions">
        <button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowUploadForm(false);
          }}
          className="btn-primary"
          disabled={loading}
        >
          {showAddForm ? '取消添加' : '添加成绩'}
        </button>
        
        <button 
          onClick={() => {
            setShowUploadForm(!showUploadForm);
            setShowAddForm(false);
          }}
          className="btn-secondary"
          disabled={loading}
        >
          {showUploadForm ? '取消上传' : 'Excel批量上传'}
        </button>
        
        <button 
          onClick={() => {
            fetchStudents();
            fetchAllGrades();
          }}
          className="btn-secondary"
          disabled={loading || studentsLoading}
        >
          刷新数据
        </button>
      </div>

      {/* 单个添加成绩表单 */}
      {showAddForm && (
        <div className="add-grade-form">
          <h3>添加学生成绩</h3>
          <form onSubmit={handleAddGrade}>
            <div className="form-group">
              <label>学生:</label>
              <select
                name="student_id"
                value={newGrade.student_id}
                onChange={handleInputChange}
                required
                disabled={loading || studentsLoading}
              >
                <option value="">选择学生</option>
                {studentsLoading ? (
                  <option value="" disabled>加载中...</option>
                ) : (
                  students.map(student => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.name} ({student.studentId}) {student.class ? `- ${student.class}` : ''}
                    </option>
                  ))
                )}
              </select>
              {!studentsLoading && students.length === 0 && (
                <div className="error-text">没有可用的学生数据</div>
              )}
            </div>

            <div className="form-group">
              <label>课程名称:</label>
              <input
                type="text"
                name="course"
                value={newGrade.course}
                onChange={handleInputChange}
                placeholder="例如: 数学、英语"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>成绩:</label>
              <input
                type="number"
                name="score"
                value={newGrade.score}
                onChange={handleInputChange}
                min="0"
                max="100"
                placeholder="0-100"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>学期:</label>
              <select
                name="semester"
                value={newGrade.semester}
                onChange={handleInputChange}
                required
                disabled={loading}
              >
                <option value="2023-1">2023-2024 第一学期</option>
                <option value="2023-2">2023-2024 第二学期</option>
                <option value="2024-1">2024-2025 第一学期</option>
                <option value="2024-2">2024-2025 第二学期</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || students.length === 0}
            >
              {loading ? '提交中...' : '提交成绩'}
            </button>
          </form>
        </div>
      )}

      {/* Excel批量上传表单 */}
      {showUploadForm && (
        <div className="upload-excel-form">
          <h3>Excel批量上传成绩</h3>
          
          <div className="upload-instructions">
            <h4>使用说明:</h4>
            <ul>
              <li>请使用Excel文件 (.xlsx 或 .xls 格式)</li>
              <li>文件应包含以下列: <strong>学号</strong>, <strong>课程</strong>, <strong>成绩</strong></li>
              <li>可选列: <strong>姓名</strong>, <strong>学期</strong></li>
              <li>支持的列名: 学号/student_id/学号ID, 课程/course/课程名称, 成绩/score/grade</li>
            </ul>
          </div>

          <div className="form-group">
            <label>选择Excel文件:</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={uploading}
            />
          </div>

          {excelData && (
            <div className="excel-preview">
              <h4>预览数据 (共 {excelData.length} 条记录):</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>学号</th>
                      <th>姓名</th>
                      <th>课程</th>
                      <th>成绩</th>
                      <th>学期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td>{item.studentId}</td>
                        <td>{item.name}</td>
                        <td>{item.course}</td>
                        <td>{item.grade}</td>
                        <td>{item.semester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {excelData.length > 10 && (
                  <p>... 还有 {excelData.length - 10} 条记录</p>
                )}
              </div>
              
              <button 
                onClick={handleBulkUpload}
                className="btn-primary"
                disabled={uploading}
              >
                {uploading ? '上传中...' : `批量上传 ${excelData.length} 条记录`}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grades-list">
        <h3>所有学生成绩</h3>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>课程</th>
                  <th>成绩</th>
                  <th>学期</th>
                  <th>查询开始时间</th>
                  <th>查询结束时间</th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? (
                  grades.map((grade, index) => (
                    <tr key={index}>
                      <td>{grade.student_id}</td>
                      <td>{grade.student_name || '未知'}</td>
                      <td>{grade.course}</td>
                      <td className={`score ${grade.score >= 90 ? 'excellent' : grade.score >= 60 ? 'good' : 'poor'}`}>
                        {grade.score}
                      </td>
                      <td>{semesterDisplayNames[grade.semester] || grade.semester}</td>
                      <td>{grade.query_start || '未设置'}</td>
                      <td>{grade.query_end || '未设置'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">暂无成绩数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;