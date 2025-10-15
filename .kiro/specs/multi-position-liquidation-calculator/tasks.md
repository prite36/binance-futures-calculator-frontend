# แผนการดำเนินงาน - Multi-Position Liquidation Calculator

- [x] 1. ปรับปรุง UI ของ LiquidationCalculator เดิม
  - ปรับปรุง Position Side Toggle ให้แสดงสีเมื่อเลือกอย่างชัดเจน
  - ปรับปรุง Trading Pair Dropdown ให้มี background ที่ไม่โปร่งใส
  - เปลี่ยนจาก auto-calculate เป็น manual calculate เมื่อคลิกปุ่ม Calculate
  - ปรับปรุง Calculation Details ให้แสดง Current Leverage แทน Max Leverage
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. เพิ่ม Tab Navigation ใน FuturesCalculator
  - [x] 2.1 สร้าง Tab Navigation component
    - สร้าง interface สำหรับ tab configuration
    - ใช้ state management สำหรับ active tab
    - เพิ่ม styling ตาม design ของ Binance
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 ปรับปรุง FuturesCalculator ให้รองรับ multiple tabs
    - เพิ่ม tab navigation ใน layout
    - จัดการ conditional rendering ของ tab content
    - รักษา backward compatibility กับ component เดิม
    - _Requirements: 2.2, 2.3_

- [x] 3. สร้าง MultiPositionCalculator component หลัก
  - [x] 3.1 สร้าง component structure และ interfaces
    - สร้าง Position interface และ MultiPositionState
    - สร้าง PositionSummary interface
    - ตั้งค่า initial state และ basic layout
    - _Requirements: 2.4, 3.1, 3.2_
  
  - [x] 3.2 เพิ่ม Configuration Panel
    - ใช้ TradingPairSelector component เดิม
    - เพิ่ม Leverage Slider
    - เพิ่ม Position Side Toggle
    - เพิ่ม Balance Input
    - _Requirements: 2.4, 3.1_

- [x] 4. สร้าง Position Table component
  - [x] 4.1 สร้าง PositionTable component
    - สร้าง table structure ด้วย responsive design
    - เพิ่ม header columns สำหรับ Order Price, Quantity, Liquidation Price
    - เพิ่ม Add Position button
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 4.2 สร้าง PositionRow component
    - สร้าง input fields สำหรับ Order Price และ Quantity
    - เพิ่ม validation สำหรับ input fields
    - เพิ่ม Remove button สำหรับแต่ละ row
    - แสดง Liquidation Price หรือ error message
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [x] 4.3 เพิ่ม Mobile Responsive Design
    - สร้าง MobilePositionTable component
    - ปรับ layout สำหรับหน้าจอมือถือ
    - ทดสอบการใช้งานบนอุปกรณ์ต่างๆ
    - _Requirements: 7.2_

- [x] 5. สร้าง Multi-Position Calculation Logic
  - [x] 5.1 สร้าง cumulative calculation functions
    - สร้าง calculateCumulativePosition function
    - สร้าง calculatePositionLiquidationPrices function
    - ใช้ liquidation formula เดิมจาก lib/liquidation-formula.ts
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 8.2_
  
  - [x] 5.2 เพิ่ม Position Summary calculation
    - สร้าง calculatePositionSummary function
    - คำนวณ Total Position Size, Average Entry Price
    - คำนวณ Final Liquidation Price, Total Margin Used
    - คำนวณ Remaining Balance
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. เพิ่ม Validation และ Risk Analysis
  - [x] 6.1 สร้าง input validation functions
    - สร้าง validatePosition function
    - สร้าง validateMultiPosition function
    - เพิ่ม real-time validation feedback
    - _Requirements: 6.1, 6.4, 6.5_
  
  - [x] 6.2 สร้าง risk analysis system
    - สร้าง analyzePositionRisk function
    - ตรวจสอบ margin utilization
    - ตรวจสอบระยะห่างจาก liquidation price
    - ตรวจสอบ position ordering risks
    - _Requirements: 6.2, 6.3_

- [x] 7. สร้าง Results Summary component
  - [x] 7.1 สร้าง ResultsSummary component
    - แสดง summary cards สำหรับข้อมูลสำคัญ
    - ใช้ responsive grid layout
    - เพิ่ม proper formatting สำหรับตัวเลข
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 7.2 เพิ่ม Risk Analysis Display
    - แสดง risk level indicator
    - แสดง warnings และ recommendations
    - ใช้สีและ icon ที่เหมาะสมตาม risk level
    - _Requirements: 6.2, 6.3, 7.3_

- [x] 8. เพิ่ม Calculate Button และ Loading States
  - เพิ่ม Calculate All Positions button
  - เพิ่ม loading indicators เมื่อกำลังคำนวณ
  - จัดการ disabled states เมื่อข้อมูลไม่ครบ
  - เพิ่ม success/error feedback
  - _Requirements: 4.4, 7.4, 7.5_

- [x] 9. เพิ่ม Shared Hooks และ Utilities
  - [x] 9.1 สร้าง useTradingData hook
    - แชร์ logic การดึงข้อมูล leverage brackets
    - แชร์ logic การดึงราคาปัจจุบัน
    - ใช้ใน MultiPositionCalculator
    - _Requirements: 8.3, 8.4_
  
  - [x] 9.2 เพิ่ม performance optimizations
    - เพิ่ม memoization สำหรับ expensive calculations
    - เพิ่ม debounced input handling
    - ปรับปรุงการจัดการ re-renders
    - _Requirements: 7.1, 7.4_

- [x] 10. Integration และ Testing
  - [x] 10.1 รวม MultiPositionCalculator เข้ากับ FuturesCalculator
    - เพิ่ม tab สำหรับ Multi-Position Calculator
    - ทดสอบการเปลี่ยน tab
    - ทดสอบการทำงานร่วมกันของ components
    - _Requirements: 2.3, 7.1_
  
  - [x]* 10.2 เขียน unit tests สำหรับ calculation functions
    - ทดสอบ calculateCumulativePosition
    - ทดสอบ calculatePositionLiquidationPrices
    - ทดสอบ validation functions
    - ทดสอบ risk analysis functions
    - _Requirements: ทุก requirements_
  
  - [x]* 10.3 เขียน integration tests สำหรับ components
    - ทดสอบ MultiPositionCalculator component
    - ทดสอบ PositionTable component
    - ทดสอบ ResultsSummary component
    - ทดสอบ user interactions
    - _Requirements: ทุก requirements_

- [x] 11. UI Polish และ Final Improvements
  - [x] 11.1 ปรับปรุง styling และ animations
    - เพิ่ม smooth transitions
    - ปรับปรุง hover states
    - เพิ่ม loading animations
    - ปรับปรุง responsive breakpoints
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 11.2 เพิ่ม accessibility improvements
    - เพิ่ม proper ARIA labels
    - ปรับปรุง keyboard navigation
    - ทดสอบ screen reader compatibility
    - เพิ่ม focus indicators
    - _Requirements: 7.1, 7.2_
  
  - [x] 11.3 เพิ่ม error handling และ user feedback
    - ปรับปรุงข้อความแสดงข้อผิดพลาดเป็นภาษาไทย
    - เพิ่ม helpful tooltips
    - เพิ่ม confirmation dialogs สำหรับ destructive actions
    - เพิ่ม success notifications
    - _Requirements: 7.3, 6.1, 6.4, 6.5_