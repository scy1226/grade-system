学生成绩查询系统
一个基于 React + Node.js + AWS DynamoDB 的全栈学生成绩管理系统，支持管理员录入成绩和学生查询成绩功能。

🌟 功能特性
用户角色
学生用户：登录系统查询个人成绩

管理员/教师：登录系统管理学生信息和录入成绩

核心功能
🔐 用户身份认证和权限管理

📊 学生成绩查询和展示

👨‍🏫 管理员成绩录入和管理

📱 响应式界面设计

🔍 实时数据验证和错误处理

🛠 技术栈
前端
React - 用户界面框架

CSS3 - 样式设计

Axios - HTTP 请求库

后端
Node.js - 服务器运行环境

Express.js - Web 应用框架

AWS SDK - AWS 服务连接

数据库
Amazon DynamoDB - NoSQL 数据库服务

部署与开发
dotenv - 环境变量管理

CORS - 跨域资源共享

📁 项目结构
text
student-grade-system/
├── backend/                 # 后端服务
│   ├── server.js           # 主服务器文件
│   ├── package.json        # 后端依赖配置
│   └── node_modules/       # 后端依赖包
├── frontend/               # 前端应用
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── App.js          # 主应用组件
│   │   ├── App.css         # 应用样式
│   │   ├── AdminPanel.js   # 管理员面板组件
│   │   └── AdminPanel.css  # 管理员面板样式
│   └── package.json        # 前端依赖配置
├── .env                    # 环境变量配置
└── README.md               # 项目说明文档
🚀 快速开始
环境要求
Node.js 14+

AWS 账户（用于 DynamoDB）

npm 或 yarn 包管理器

安装步骤
克隆项目

bash
git clone <your-repository-url>
cd student-grade-system
配置环境变量
在项目根目录创建 .env 文件：

env
# AWS 配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB 表名
DYNAMODB_TABLE_STUDENTS=Students
DYNAMODB_TABLE_GRADES=Grades

# 服务器端口
PORT=5000
安装后端依赖

bash
cd backend
npm install
安装前端依赖

bash
cd frontend
npm install
运行项目
启动后端服务

bash
cd backend
npm start
服务将在 http://localhost:5000 启动

启动前端应用

bash
cd frontend
npm start
应用将在 http://localhost:3000 启动

📋 数据库设置
DynamoDB 表结构
Students 表（学生信息）

student_id (String) - 主键

name (String) - 学生姓名

class (String) - 班级

role (String) - 用户角色（student/admin）

Grades 表（成绩信息）

student_id (String) - 分区键

course (String) - 排序键（课程名称）

score (Number) - 成绩

semester (String) - 学期

query_start (String) - 查询开始日期

query_end (String) - 查询结束日期

初始化测试数据
使用以下命令创建测试账号：

bash
cd backend
node init-data.js
或通过 API 创建：

bash
curl -X POST http://localhost:5000/api/init-data
🔧 API 接口文档
认证相关
POST /api/login - 用户登录

POST /api/logout - 用户登出

学生功能
GET /api/grades/:student_id - 查询学生成绩

管理员功能
GET /api/admin/students - 获取所有学生列表

POST /api/admin/grades - 添加/更新学生成绩

GET /api/admin/all-grades - 查看所有成绩

系统功能
GET /api/test-connection - 测试数据库连接

GET /api/debug-test - 调试接口

👥 测试账号
账号	密码	角色	权限
admin	无	管理员	完全权限
T001	无	教师	成绩管理
2025001	无	学生	成绩查询
2025002	无	学生	成绩查询
