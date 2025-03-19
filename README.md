# CPE-Siren

## Overview
CPE Siren เป็นอีกหนึ่งช่องทางสำหรับการมอนิเตอร์เครือข่าย ซึ่งสามารถติดตามข้อมูลภายในเครือข่าย แจ้งเตือนเหตุการณ์ที่ผิดปกติภายในเครือข่าย และนำ ไปวิเคราะห์ปัญหาที่ อาจเกิดขึ้นในอนาคต อีกทั้งยังช่วยเพิ่มความความสะดวกสบายในการตรวจสอบข้อมูลเครือข่าย

## Prerequisites
ก่อนเริ่มต้นใช้งาน โปรดติดตั้งเครื่องมือและซอฟต์แวร์ที่จำเป็น:
- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

## Setup Project
1. **Clone Repository**  
   ```sh
   git clone https://github.com/CPEsiren/Backend.git
   cd Backend
2. **ติดตั้ง Dependencies**
   ```sh
   npm install
3. **ตั้งค่าไฟล์ Environment**

   คัดลอกไฟล์ตัวอย่าง .env.example แล้วตั้งค่าค่าต่าง ๆ
   ```sh
   cp .env.example .env
4. **Start Project**
   ```sh
   npm run dev

## Deploy With Docker
1. **Clone Repository**  
   ```sh
   git clone https://github.com/CPEsiren/Backend.git
   cd Backend
2. สั่งรัน docker compose file
   ```sh
   docker-compose up -d   
