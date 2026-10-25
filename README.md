# Smart Grade Entry (ប្រព័ន្ធស្វ័យប្រវត្តិកម្មបញ្ចូលពិន្ទុឆ្លាតវៃ)

Smart Grade Entry is an AI-powered automated grading and student management system that leverages OCR (Optical Character Recognition) to extract, recognize, and verify student IDs and scores directly from scanned exam papers.

---

## 💻 Programming Languages (ភាសាកូដដែលប្រើប្រាស់)

| Language | Usage / កន្លែងប្រើប្រាស់ | Details |
| :--- | :--- | :--- |
| **TypeScript** | **Frontend & Backend (Core)** | ប្រើប្រាស់ជាភាសាចម្បងទាំងសងខាង ដើម្បីសុវត្ថិភាព Type-safety និង Clean Architecture |
| **JavaScript (ESNext)** | Tooling & Runtime | ដំណើរការលើ Node.js Runtime និង Build scripts |
| **HTML5 & CSS3** | User Interface | រៀបចំរចនាសម្ព័ន្ធទំព័រ និងកំណត់ Styling ជាមួយ Tailwind CSS |
| **SQL** | Database Management | គ្រប់គ្រង Schema និង Query ទិន្នន័យតាមរយៈ Prisma ORM |
| **PowerShell** | DevOps / Automation | Script សម្រាប់បញ្ជាបើកប្រព័ន្ធទាំងអស់ដោយចុចតែម្តង (`run-all.ps1`) |

---

## 🗄️ Database (ប្រព័ន្ធផ្ទុកទិន្នន័យ)

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Database Engine** | **PostgreSQL (v15+)** | ប្រព័ន្ធទិន្នន័យប្រភេទ Relational Database (SQL) ដែលមានសុវត្ថិភាព និងល្បឿនលឿន |
| **ORM / Migration** | **Prisma ORM** | ឧបករណ៍គ្រប់គ្រង Database Schema, Migrations, និងបង្កើត Type-safe Client ដោយស្វ័យប្រវត្តិ |
| **Local Environment** | **Docker & Docker Compose** | ដំណើរការ PostgreSQL ក្នុង Docker Container (`postgres:15`) លើ Port `5433` |
| **Production Cloud** | **PostgreSQL Cloud / Render** | ភ្ជាប់ទៅកាន់ Cloud PostgreSQL សម្រាប់បម្រើការលើប្រព័ន្ធ Online |

---

## 🛠️ Complete Tech Stack (បច្ចេកវិទ្យាទាំងអស់ដែលប្រើ)

### 🎨 Frontend
- **Framework**: React 18 / 19 with Vite (Fast HMR & Optimized Bundling)
- **Styling**: Tailwind CSS & Modern Glassmorphism Design
- **Icons**: Lucide React
- **Routing**: React Router DOM (v7)
- **HTTP Client**: Axios with Auto-Auth Interceptors
- **Deployment**: Vercel (`smart-grade-vert.vercel.app`)

### ⚙️ Backend
- **Framework**: NestJS (Node.js Enterprise Architecture)
- **Security & Auth**: Passport.js, JWT (JSON Web Tokens), BCrypt
- **File Uploads**: Multer
- **API Spec**: RESTful APIs with CORS Support for Cloud & Localhost
- **Deployment**: Render Cloud (`smartgrade-2t2x.onrender.com`)

### 🧠 AI & OCR Engine (ការសម្គាល់អក្សរ និងពិន្ទុ)
- **OCR Engine**: Tesseract.js
- **Language Models**:
  - `khm.traineddata` (គាំទ្រការអានអក្សរខ្មែរ)
  - `eng.traineddata` (គាំទ្រការអានលេខ និងអក្សរអង់គ្លេស)
- **Image Processing**: Sharp & Jimp (សម្រាប់កាត់ បង្វិល បង្កើនកម្រិតច្បាស់ និង Contrast នៃក្រដាសប្រឡង)
- **Data Import**: SheetJS (XLSX) & ExcelJS (គាំទ្រ Auto-Mapping តារាងសិស្សកម្ពុជា)

---

## ✨ Key Features (មុខងារសំខាន់ៗ)

- 📄 **Exam Paper Scanner & OCR**: ស្កេន និងចាប់យកអត្តលេខសិស្ស និងពិន្ទុដោយស្វ័យប្រវត្តិតាមរយៈ AI
- 🔍 **Interactive Verification**: ផ្ទាំងផ្ទៀងផ្ទាត់ពិន្ទុ និងរូបភាពក្រដាសប្រឡងជាក់ស្ដែងសម្រាប់គ្រូបង្រៀន
- 👥 **Student & Class Roster**:
  - បង្កើត កែប្រែ (Rename) និងលុប (Delete) ថ្នាក់រៀន
  - Auto-Sync ទិន្នន័យសិស្សពី Excel/CSV និង Google Sheets តាមទម្រង់ផ្លូវការរបស់កម្ពុជា
- 📊 **Gradebook & Reports**: បូកសរុបពិន្ទុ គណនាភាគរយ និង Export ជា Excel
- 🔐 **Role-based Authentication**: ប្រព័ន្ធ Login សុវត្ថិភាពសម្រាប់គ្រូបង្រៀន និងអ្នកគ្រប់គ្រង

---

## 🚀 Getting Started (ការតម្លើង និងដំណើរការ)

### 1. Prerequisites (តម្រូវការជាមុន)
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (សម្រាប់ Database)

### 2. Run All Services (វិធីរហ័ស)
បើក PowerShell នៅក្នុង Folder គម្រោង រួចដំណើរការ៖
```powershell
.\run-all.ps1
```
Script នេះនឹង៖
1. បើក Database លើ Docker Container (`localhost:5433`)
2. បើក Backend NestJS (`http://localhost:3000`)
3. បើក Frontend Vite (`http://localhost:5173`)

### 3. Default Credentials (គណនីចូលប្រើ)
- **URL**: `http://localhost:5173/login`
- **Email**: `teacher@example.com`
- **Password**: `password123`
