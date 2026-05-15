import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

// โหลด Environment Variables จากไฟล์ .env.local สำหรับ Next.js
config({ path: ".env.local" });
config({ path: ".env" }); // โหลด .env เผื่อไว้ด้วย

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // ใช้ DIRECT_URL (Port 5432) สำหรับรันคำสั่งพวก Prisma CLI เช่น db push หรือ migrate 
    // ส่วนแอปพลิเคชันหลักจะใช้ DATABASE_URL (Port 6543) ผ่านตัว Adapter แทน
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
