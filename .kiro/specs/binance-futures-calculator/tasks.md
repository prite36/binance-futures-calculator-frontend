# แผนการดำเนินงาน

- [x] 1. เพิ่ม API endpoints สำหรับดึงข้อมูล Binance Futures
  - สร้าง API route สำหรับดึงรายการคู่เทรดทั้งหมด
  - สร้าง API route สำหรับดึงราคาปัจจุบันของคู่เทรด
  - ปรับปรุง API route สำหรับดึง leverage brackets ให้รองรับหลายคู่เทรด
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 2. สร้าง Trading Pair Selector component
  - [x] 2.1 สร้าง TradingPairSelector component ด้วย dropdown interface
    - ใช้ shadcn/ui Select component
    - แสดงรายการคู่เทรดในรูปแบบ "BTCUSDT Perp"
    - มี loading state และ error handling
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 เพิ่ม search/filter functionality ใน dropdown
    - ให้ผู้ใช้สามารถค้นหาคู่เทรดได้
    - แสดงผลลัพธ์ที่ตรงกับการค้นหา
    - _Requirements: 1.1_

- [x] 3. ปรับปรุง LiquidationCalculator component
  - [x] 3.1 เพิ่ม Trading Pair Selector ที่ด้านบนของ component
    - วาง TradingPairSelector ก่อน margin mode selectors
    - จัดการ state สำหรับ selectedSymbol
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 เพิ่ม dynamic asset labels
    - เปลี่ยน label "BTC" เป็น base asset ของคู่เทรดที่เลือก
    - อัปเดต placeholder values ตามคู่เทรดที่เลือก
    - _Requirements: 1.2_
  
  - [x] 3.3 ปรับปรุง leverage slider ให้ใช้ค่า min/max จาก API
    - ดึงค่า max leverage จาก leverage brackets API
    - อัปเดต slider min/max values
    - ปรับ leverage marks บน slider ให้เหมาะสม
    - _Requirements: 1.2, 2.5_

- [x] 4. ปรับปรุงการจัดการข้อมูล API
  - [x] 4.1 เพิ่ม state management สำหรับ trading pairs
    - เพิ่ม state สำหรับ selectedSymbol, tradingPairs, maxLeverage
    - จัดการ loading states สำหรับข้อมูลใหม่
    - _Requirements: 1.2, 5.1_
  
  - [x] 4.2 ปรับปรุงการดึงข้อมูล leverage brackets
    - เปลี่ยนจาก hardcode BTCUSDT เป็นใช้ selectedSymbol
    - เพิ่ม error handling สำหรับคู่เทรดที่ไม่รองรับ
    - _Requirements: 1.2, 1.4, 5.2_
  
  - [x] 4.3 เพิ่มการดึงราคาปัจจุบัน
    - ดึงราคาปัจจุบันของคู่เทรดที่เลือก
    - อัปเดตราคาทุก 30 วินาที
    - แสดงราคาปัจจุบันใน UI
    - _Requirements: 5.1, 5.3_

- [x] 5. ปรับปรุงสูตรการคำนวณ liquidation price
  - [x] 5.1 ปรับปรุง liquidation-formula.ts ให้รองรับหลายคู่เทรด
    - เปลี่ยนจาก hardcode BTCUSDT_TIERS เป็นรับ tiers จาก parameter
    - ปรับปรุง logging ให้แสดงชื่อคู่เทรดที่ถูกต้อง
    - _Requirements: 4.1, 4.4_
  
  - [x] 5.2 เพิ่มการตรวจสอบความถูกต้องของข้อมูล
    - ตรวจสอบว่า leverage ไม่เกินค่าสูงสุดที่อนุญาต
    - ตรวจสอบขนาดตำแหน่งขั้นต่ำและสูงสุด
    - _Requirements: 2.2, 2.5, 7.4_

- [x] 6. เพิ่ม error handling และ validation
  - [x] 6.1 เพิ่ม validation สำหรับ input fields
    - ตรวจสอบค่าที่ป้อนเป็นตัวเลขบวก
    - ตรวจสอบขนาดตำแหน่งไม่เกินขีดจำกัด
    - แสดงข้อความแสดงข้อผิดพลาดที่เหมาะสม
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 6.2 เพิ่ม error handling สำหรับ API calls
    - จัดการกรณี API ล้มเหลว
    - แสดงข้อความแสดงข้อผิดพลาดและกลไกลองใหม่
    - ใช้ fallback data เมื่อจำเป็น
    - _Requirements: 1.4, 5.4_

- [x] 7. ปรับปรุง UI/UX
  - [x] 7.1 เพิ่ม loading states และ indicators
    - แสดง loading spinner เมื่อดึงข้อมูล
    - แสดงสถานะการโหลดที่เหมาะสม
    - _Requirements: 1.3, 6.2_
  
  - [x] 7.2 เพิ่มข้อมูลเพิ่มเติมใน results panel
    - แสดงข้อมูลคู่เทรดที่เลือก
    - แสดงราคาปัจจุบัน
    - แสดงค่า maintenance margin rate ที่ใช้
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. การทดสอบและ optimization
  - [ ]* 8.1 เขียน unit tests สำหรับ components ใหม่
    - ทดสอบ TradingPairSelector component
    - ทดสอบการอัปเดต leverage slider
    - ทดสอบการเปลี่ยนคู่เทรด
    - _Requirements: ทุก requirements_
  
  - [ ]* 8.2 เขียน integration tests สำหรับ API calls
    - ทดสอบการดึงข้อมูลคู่เทรด
    - ทดสอบการดึง leverage brackets
    - ทดสอบการดึงราคาปัจจุบัน
    - _Requirements: 5.1, 5.2_
  
  - [x] 8.3 ปรับปรุงประสิทธิภาพ
    - เพิ่ม caching สำหรับข้อมูลที่ไม่เปลี่ยนแปลงบ่อย
    - ปรับปรุงการจัดการ re-renders
    - _Requirements: 5.3_