const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { DynamoDBClient, GetItemCommand, QueryCommand, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

console.log('🎯 这是修改后的 server.js 版本 - 包含Excel批量上传功能');

// 更详细的调试信息
console.log('=== 环境变量检查 ===');
console.log('当前目录:', __dirname);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '已设置' : '未设置');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '已设置' : '未设置');
console.log('DYNAMODB_TABLE_STUDENTS:', process.env.DYNAMODB_TABLE_STUDENTS);
console.log('DYNAMODB_TABLE_GRADES:', process.env.DYNAMODB_TABLE_GRADES);
console.log('========================');

// 创建 DynamoDB 客户端
const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
  
  if (process.env.AWS_SESSION_TOKEN) {
    clientConfig.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
  }
}

console.log('DynamoDB 客户端配置:', {
  region: clientConfig.region,
  hasCredentials: !!clientConfig.credentials
});

const client = new DynamoDBClient(clientConfig);

const STUDENTS_TABLE = process.env.DYNAMODB_TABLE_STUDENTS;
const GRADES_TABLE = process.env.DYNAMODB_TABLE_GRADES;

// 调试端点
app.get('/api/debug-test', (req, res) => {
  console.log('✅ 调试端点被调用 - 代码运行正常');
  res.json({ 
    message: '调试测试成功 - 包含完整学生和成绩管理功能',
    timestamp: new Date().toISOString(),
    version: '包含Excel批量上传版本'
  });
});

// 登录接口 - 修改为返回用户角色信息
app.post('/api/login', async (req, res) => {
  const { student_id } = req.body;
  console.log('🔍【登录请求】学号:', student_id);
  
  if (!student_id) return res.status(400).json({ error: '缺少学号' });

  try {
    const command = new GetItemCommand({
      TableName: STUDENTS_TABLE,
      Key: { student_id: { S: student_id } },
    });
    const result = await client.send(command);
    if (!result.Item) {
      console.log('❌【登录】用户不存在:', student_id);
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = unmarshall(result.Item);
    console.log('🔍【登录】数据库查询结果:', user);
    
    // 判断用户类型
    let userType = 'student';
    if (user.role === 'admin' || user.class === '教师' || user.class === '管理员') {
      userType = 'admin';
    }
    
    console.log('🔍【登录】识别的用户类型:', userType);
    
    const responseData = { 
      success: true, 
      user: {
        ...user,
        userType: userType
      }
    };
    
    console.log('🔍【登录】返回的数据:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);
  } catch (err) {
    console.error('❌【DynamoDB 错误 - 登录】:', err);
    res.status(500).json({ 
      error: '数据库错误',
      details: err.message,
      code: err.name
    });
  }
});

// 获取所有学生列表 - 修复保留关键字问题
app.get('/api/students', async (req, res) => {
  console.log('🔍【获取学生列表】请求收到');
  
  try {
    console.log('🔍【获取学生列表】查询表:', STUDENTS_TABLE);
    
    // 使用 ExpressionAttributeNames 处理保留关键字
    const command = new ScanCommand({
      TableName: STUDENTS_TABLE,
      FilterExpression: 'attribute_not_exists(#role) OR #role <> :adminRole',
      ExpressionAttributeNames: {
        '#role': 'role'  // 使用 #role 代替保留关键字 role
      },
      ExpressionAttributeValues: {
        ':adminRole': { S: 'admin' }
      }
    });
    
    const result = await client.send(command);
    console.log('🔍【获取学生列表】查询结果数量:', result.Items ? result.Items.length : 0);
    
    const students = result.Items ? result.Items.map(item => {
      const student = unmarshall(item);
      console.log('🔍【处理学生数据】:', student);
      return {
        studentId: student.student_id,
        name: student.name,
        class: student.class
      };
    }) : [];
    
    console.log('🔍【获取学生列表】返回学生:', students);
    
    res.json({
      success: true,
      data: students
    });
  } catch (err) {
    console.error('❌【DynamoDB 错误 - 获取学生列表】:', err);
    res.status(500).json({ 
      success: false,
      error: '获取学生列表失败',
      details: err.message,
      code: err.name
    });
  }
});

// 获取所有成绩（管理员用）
app.get('/api/admin/all-grades', async (req, res) => {
  console.log('🔍【获取所有成绩】管理员请求');
  
  try {
    console.log('🔍【获取所有成绩】查询表:', GRADES_TABLE);
    
    const command = new ScanCommand({
      TableName: GRADES_TABLE,
    });
    
    const result = await client.send(command);
    console.log('🔍【获取所有成绩】原始结果数量:', result.Items ? result.Items.length : 0);
    
    const grades = result.Items ? result.Items.map(item => unmarshall(item)) : [];
    console.log('🔍【获取所有成绩】解析后的成绩:', grades);
    
    // 获取学生信息以补充姓名
    const studentsCommand = new ScanCommand({
      TableName: STUDENTS_TABLE,
    });
    
    const studentsResult = await client.send(studentsCommand);
    const studentsMap = {};
    
    if (studentsResult.Items) {
      studentsResult.Items.forEach(item => {
        const student = unmarshall(item);
        studentsMap[student.student_id] = student.name;
      });
    }
    
    console.log('🔍【学生姓名映射】:', studentsMap);
    
    // 补充学生姓名
    const gradesWithNames = grades.map(grade => ({
      ...grade,
      student_name: studentsMap[grade.student_id] || '未知'
    }));
    
    console.log('🔍【获取所有成绩】最终返回数据数量:', gradesWithNames.length);
    
    res.json(gradesWithNames);
  } catch (err) {
    console.error('❌【DynamoDB 错误 - 获取所有成绩】:', err);
    res.status(500).json({ 
      error: '获取成绩列表失败',
      details: err.message
    });
  }
});

// 添加管理员上传成绩接口
app.post('/api/admin/grades', async (req, res) => {
  const { studentId, course, grade, semester } = req.body;
  console.log('🔍【管理员上传成绩】请求数据:', req.body);
  
  if (!studentId || !course || !grade || !semester) {
    return res.status(400).json({ 
      success: false,
      error: '缺少必要字段: studentId, course, grade, semester' 
    });
  }

  try {
    // 设置查询时间范围（根据学期自动计算）
    const now = new Date();
    let query_start, query_end;
    
    // 根据学期设置查询时间范围
    const year = semester.split('-')[0];
    if (semester.includes('1')) {
      // 第一学期：9月到次年1月
      query_start = `${year}-09-01`;
      query_end = `${parseInt(year) + 1}-01-31`;
    } else {
      // 第二学期：2月到7月
      query_start = `${year}-02-01`;
      query_end = `${year}-07-31`;
    }

    const command = new PutItemCommand({
      TableName: GRADES_TABLE,
      Item: {
        student_id: { S: studentId },
        course: { S: course },
        score: { N: grade.toString() },
        semester: { S: semester },
        query_start: { S: query_start },
        query_end: { S: query_end },
      },
    });
    
    await client.send(command);
    console.log('✅【管理员上传成绩】成功:', { studentId, course, grade, semester, query_start, query_end });
    
    res.json({ 
      success: true,
      message: '成绩添加成功'
    });
  } catch (err) {
    console.error('❌【DynamoDB 错误 - 管理员上传成绩】:', err);
    res.status(500).json({ 
      success: false,
      error: '上传成绩失败',
      details: err.message
    });
  }
});

// 批量上传成绩接口 (Excel文件处理)
app.post('/api/admin/bulk-grades', async (req, res) => {
  console.log('🔍【批量上传成绩】请求收到');
  
  try {
    const { grades } = req.body;
    
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有有效的成绩数据'
      });
    }

    console.log('🔍【批量上传成绩】处理数据条数:', grades.length);

    const results = {
      total: grades.length,
      success: 0,
      failed: 0,
      errors: []
    };

    // 批量处理成绩
    for (const gradeData of grades) {
      try {
        const { studentId, course, grade, semester } = gradeData;
        
        if (!studentId || !course || !grade || !semester) {
          results.failed++;
          results.errors.push(`缺少必要字段: ${JSON.stringify(gradeData)}`);
          continue;
        }

        // 设置查询时间范围
        const year = semester.split('-')[0];
        let query_start, query_end;
        
        if (semester.includes('1')) {
          query_start = `${year}-09-01`;
          query_end = `${parseInt(year) + 1}-01-31`;
        } else {
          query_start = `${year}-02-01`;
          query_end = `${year}-07-31`;
        }

        const command = new PutItemCommand({
          TableName: GRADES_TABLE,
          Item: {
            student_id: { S: studentId },
            course: { S: course },
            score: { N: grade.toString() },
            semester: { S: semester },
            query_start: { S: query_start },
            query_end: { S: query_end },
          },
        });
        
        await client.send(command);
        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push(`学号 ${gradeData.studentId} 课程 ${gradeData.course}: ${error.message}`);
        console.error('❌【批量上传单个成绩失败】:', error);
      }
    }

    console.log('✅【批量上传成绩】完成:', results);

    res.json({
      success: true,
      message: `批量上传完成: 成功 ${results.success} 条，失败 ${results.failed} 条`,
      results: results
    });

  } catch (err) {
    console.error('❌【DynamoDB 错误 - 批量上传成绩】:', err);
    res.status(500).json({
      success: false,
      error: '批量上传失败',
      details: err.message
    });
  }
});

// Excel文件上传接口
app.post('/api/admin/upload-excel', (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    
    if (!fileData) {
      return res.status(400).json({
        success: false,
        error: '没有文件数据'
      });
    }

    console.log('🔍【Excel上传】文件名:', fileName);

    // 解析Base64数据
    const base64Data = fileData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 获取第一个工作表
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('🔍【Excel上传】解析数据:', data);

    // 验证和转换数据格式
    const grades = [];
    const errors = [];

    data.forEach((row, index) => {
      try {
        // 根据Excel列名调整字段映射
        const studentId = row['学号'] || row['student_id'] || row['学号ID'] || row['studentId'];
        const name = row['姓名'] || row['name'] || row['学生姓名'] || row['studentName'];
        const course = row['课程'] || row['course'] || row['课程名称'] || row['courseName'];
        const grade = row['成绩'] || row['score'] || row['grade'] || row['分数'];
        const semester = row['学期'] || row['semester'] || '2023-2';

        if (!studentId || !course || grade === undefined || grade === null) {
          errors.push(`第${index + 2}行数据不完整: 学号=${studentId}, 课程=${course}, 成绩=${grade}`);
          return;
        }

        const numericGrade = Number(grade);
        if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
          errors.push(`第${index + 2}行成绩无效: ${grade}`);
          return;
        }

        grades.push({
          studentId: studentId.toString(),
          name: name ? name.toString() : '未知',
          course: course.toString(),
          grade: numericGrade,
          semester: semester.toString()
        });

      } catch (error) {
        errors.push(`第${index + 2}行数据格式错误: ${error.message}`);
      }
    });

    console.log('🔍【Excel上传】转换后成绩数据:', grades);

    res.json({
      success: true,
      data: grades,
      errors: errors,
      message: `解析成功: ${grades.length} 条记录，${errors.length} 个错误`
    });

  } catch (err) {
    console.error('❌【Excel解析错误】:', err);
    res.status(500).json({
      success: false,
      error: 'Excel文件解析失败',
      details: err.message
    });
  }
});

// 查询成绩（学生用）
app.get('/api/grades/:student_id', async (req, res) => {
  const { student_id } = req.params;
  const now = new Date().toISOString().split('T')[0];

  try {
    const command = new QueryCommand({
      TableName: GRADES_TABLE,
      KeyConditionExpression: 'student_id = :sid',
      FilterExpression: '#start <= :now AND #end >= :now',
      ExpressionAttributeNames: {
        '#start': 'query_start',
        '#end': 'query_end'
      },
      ExpressionAttributeValues: {
        ':sid': { S: student_id },
        ':now': { S: now },
      },
    });
    const result = await client.send(command);
    const grades = result.Items ? result.Items.map(unmarshall) : [];
    res.json(grades);
  } catch (err) {
    console.error('❌【DynamoDB 错误 - 查询成绩】:', err);
    res.status(500).json({ 
      error: '数据库错误',
      details: err.message
    });
  }
});

// 上传成绩（通用接口）
app.post('/api/grades', async (req, res) => {
  const { student_id, course, score, semester, query_start, query_end } = req.body;
  if (!student_id || !course || !score || !semester || !query_start || !query_end) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  try {
    const command = new PutItemCommand({
      TableName: GRADES_TABLE,
      Item: {
        student_id: { S: student_id },
        course: { S: course },
        score: { N: score.toString() },
        semester: { S: semester },
        query_start: { S: query_start },
        query_end: { S: query_end },
      },
    });
    await client.send(command);
    res.json({ success: true });
  } catch (err) {
    console.error('❌【DynamoDB 错误 - 上传成绩】:', err);
    res.status(500).json({ 
      error: '数据库错误',
      details: err.message
    });
  }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      dynamodb: 'connected',
      api: 'running'
    }
  });
});

// 测试数据库连接
app.get('/api/test-connection', async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: STUDENTS_TABLE,
      Limit: 1
    });
    
    await client.send(command);
    res.json({
      success: true,
      message: 'DynamoDB 连接正常',
      tables: {
        students: STUDENTS_TABLE,
        grades: GRADES_TABLE
      }
    });
  } catch (err) {
    console.error('❌【数据库连接测试失败】:', err);
    res.status(500).json({
      success: false,
      error: 'DynamoDB 连接失败',
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎯 包含Excel批量上传功能的后端 API 运行在 http://localhost:${PORT}`);
  console.log(`📊 学生管理：GET http://localhost:${PORT}/api/students`);
  console.log(`📈 成绩管理：GET http://localhost:${PORT}/api/admin/all-grades`);
  console.log(`➕ 添加成绩：POST http://localhost:${PORT}/api/admin/grades`);
  console.log(`📁 Excel上传：POST http://localhost:${PORT}/api/admin/upload-excel`);
  console.log(`📦 批量上传：POST http://localhost:${PORT}/api/admin/bulk-grades`);
  console.log(`🔐 登录测试：POST http://localhost:${PORT}/api/login`);
  console.log(`🧪 连接测试：GET http://localhost:${PORT}/api/test-connection`);
  console.log(`❤️  健康检查：GET http://localhost:${PORT}/api/health`);
});