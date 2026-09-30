# DUC2026_PGB_Scoring-Assistant_Team2

📚 **Scoring Assistant** គឺជាប្រព័ន្ធស្វ័យប្រវត្តិនៃការបញ្ចូលពិន្ទុដោយប្រើប្រាស់ AI (AI-powered automated system) ដែលត្រូវបបង្កើតឡើងដើម្បីសម្រួលដល់ដំណើរការកែពិន្ទុ។ ប្រព័ន្ធនេះដំណើរការដោយទាញយកអត្តលេខសិស្ស (Student IDs) និងពិន្ទុចេញពីក្រដាសប្រឡងតាមរយៈបច្ចេកវិទ្យា Optical Character Recognition (OCR) រួចផ្ទៀងផ្ទាត់ទិន្នន័យ និងបញ្ចូលលទ្ធផលទៅក្នុង Database និង Spreadsheet ដោយស្វ័យប្រវត្តិ។

---

## 🔄 System Architecture & Workflow

ដ្យាក្រាមខាងក្រោមបង្ហាញពីដំណើរការការងារសរុប (End-to-End Operational Pipeline) ចាប់តាំងពីការកែពិន្ទុលើក្រដាសកិច្ចការដោយផ្ទាល់ពីគ្រូបង្រៀន រហូតដល់ការ Export ទិន្នន័យចូលទៅក្នុង Google Sheets ឬ Excel៖

```mermaid
flowchart TD
    %% Teacher Actions
    subgraph Step1 ["1️⃣ Input & Capture"]
        A[👨‍🏫 Teacher / គ្រូបង្រៀន] -->|Grades manually| B[📝 Exam Paper / ក្រដាសកិច្ចការ]
        B -->|Captures/Scans| C[📱 Scan / Take Photo]
    end

    %% AI Engine
    subgraph Step2 ["2️⃣ AI Document Recognition (OCR)"]
        C --> D[🤖 AI OCR Engine]
        D -->|Extract| E1[🪪 Read Student ID]
        D -->|Extract| E2[💯 Read Score]
    end

    %% System Core
    subgraph Step3 ["3️⃣ Data Matching & Validation"]
        E1 & E2 --> F[🔗 Match Student ID & Score]
        F --> G[🗄️ Query Student in Database]
        G --> H{✔️ Validation}
        H -- Valid --> I[⚡ Auto-Fill Score]
        H -- Invalid --> J[⚠️ Flag for Manual Review]
    end

    %% Final Output
    subgraph Step4 ["4️⃣ Output Integration"]
        I --> K[(📊 Excel / Google Sheets)]
    end

    %% Styling & Theme
    style Step1 fill:#f0f7ff,stroke:#0284c7,stroke-width:2px
    style Step2 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style Step3 fill:#fffbeb,stroke:#d97706,stroke-width:2px
    style Step4 fill:#fdf2f8,stroke:#db2777,stroke-width:2px
    
    style A fill:#0284c7,color:#fff
    style D fill:#16a34a,color:#fff
    style K fill:#16a34a,color:#fff