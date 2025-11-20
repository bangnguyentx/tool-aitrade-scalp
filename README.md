# 🚀 Quantum Trading Suite

Hệ thống tín hiệu trading tự động sử dụng AI để phân tích thị trường Binance Futures.

## ✨ Tính Năng

### 🤖 AI Analysis Engine
- **Tự động quét 10 coins phổ biến nhất** mỗi 15 phút (xx:01, xx:16, xx:31, xx:46)
- **Multi-timeframe analysis**: D1, H4, H1, M15
- **Chỉ báo kỹ thuật**: EMA, RSI, Volume Analysis, Support/Resistance
- **Confidence Score 100%** mới tạo tín hiệu
- **Cooldown 2 tiếng** sau khi tạo tín hiệu cho mỗi coin

### 📊 Signal Management
- **Bảng tín hiệu đang hoạt động** với thông tin đầy đủ
- **Bảng tín hiệu đã hoàn thành** với win/lose và profit %
- **Tự động tracking**: Bot quét mỗi 5 phút để kiểm tra Entry/TP/SL
- **Persistent storage**: Tín hiệu vẫn hiển thị dù admin tắt/bật lại web

### 📈 Statistics & Analytics
- **Thống kê hôm nay**: Tổng tín hiệu, win/lose, profit %
- **Thống kê tuần**: Tổng kết 7 ngày
- **Bảng tổng kết 23h** mỗi ngày tự động
- **Win rate** và **Average RR** tracking

### 🔐 Authentication & Permissions
- **Key-based authentication**
- **Admin panel** với đầy đủ quyền:
  - Tạo key (1 tuần/1 tháng/3 tháng/vĩnh viễn)
  - Gửi tín hiệu thủ công
  - Xóa tín hiệu AI
  - Thêm/xóa admin (không thể xóa master admin)
- **Master admin key**: `BangAdmin17`

### 🎨 Modern UI/UX
- **Responsive design** cho mobile/tablet/desktop
- **Dark mode** với hiệu ứng 3D
- **Smooth animations** và transitions
- **Real-time updates** mỗi 30 giây

## 📁 Cấu Trúc Dự Án

```
quantum-trading-suite/
├── index.html              # Trang chính
├── css/
│   ├── style.css          # Style chính
│   └── animations.css     # Hiệu ứng animation
├── js/
│   ├── storage.js         # Quản lý dữ liệu
│   ├── auth.js            # Xác thực
│   ├── analysis.js        # AI Analysis Engine
│   ├── signals.js         # Quản lý tín hiệu
│   ├── admin.js           # Admin panel
│   └── main.js            # File chính
└── README.md              # File này
```

## 🚀 Triển Khai

### Phương án 1: GitHub Pages (Đơn giản nhất)

1. **Tạo repository trên GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quantum-trading.git
git push -u origin main
```

2. **Bật GitHub Pages:**
   - Vào Settings > Pages
   - Source: Deploy from branch `main`
   - Folder: `/ (root)`
   - Save

3. **Truy cập:** `https://YOUR_USERNAME.github.io/quantum-trading/`

### Phương án 2: Render (Khuyến nghị)

1. **Tạo file `package.json`:**
```json
{
  "name": "quantum-trading-suite",
  "version": "1.0.0",
  "scripts": {
    "start": "npx http-server -p 3000"
  },
  "dependencies": {
    "http-server": "^14.1.1"
  }
}
```

2. **Push lên GitHub** (như trên)

3. **Deploy trên Render:**
   - Tạo tài khoản tại render.com
   - New > Static Site
   - Connect GitHub repository
   - Build Command: `npm install`
   - Publish Directory: `.`
   - Deploy

### Phương án 3: Vercel

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Hoặc deploy qua Vercel dashboard** (connect GitHub)

## ⚙️ Cấu Hình

### Time Settings (trong `analysis.js`)

```javascript
// Thời gian quét (hiện tại: mỗi 15 phút)
const scanMinutes = [1, 16, 31, 46];

// Giờ hoạt động (5h sáng - 9h31 tối)
if (currentHour < 5 || currentHour > 21)

// Cooldown (2 tiếng)
const twoHours = 2 * 60 * 60 * 1000;

// Tracking interval (5 phút)
5 * 60 * 1000
```

### Top Coins (trong `analysis.js`)

```javascript
topCoins: [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'XRPUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'AVAXUSDT',
    'LINKUSDT',
    'MATICUSDT'
]
```

### Trading Levels (trong `analysis.js`)

```javascript
// LONG
entry: price * 0.998  (-0.2%)
tp: price * 1.02      (+2%)
sl: price * 0.985     (-1.5%)

// SHORT  
entry: price * 1.002  (+0.2%)
tp: price * 0.98      (-2%)
sl: price * 1.015     (+1.5%)
```

## 🔑 Keys Mặc Định

### Master Admin
```
Key: BangAdmin17
Quyền: Full access (không thể xóa)
```

### Tạo User Keys
Admin có thể tạo keys với các loại:
- **1 Tuần**: Hết hạn sau 7 ngày
- **1 Tháng**: Hết hạn sau 30 ngày
- **3 Tháng**: Hết hạn sau 90 ngày
- **Vĩnh Viễn**: Không hết hạn

## 📊 Cách Hoạt Động

### 1. Scan Cycle (Mỗi 15 phút)
```
05:01, 05:16, 05:31, 05:46
06:01, 06:16, 06:31, 06:46
...
21:01, 21:16, 21:31
```

### 2. Analysis Flow
```
1. Lấy candles từ Binance (D1, H4, H1, M15)
2. Tính toán indicators (EMA, RSI, Volume)
3. Phân tích trend và levels
4. Tính confidence score
5. Nếu confidence = 100% → Tạo signal
6. Thêm coin vào cooldown 2 tiếng
7. Thêm signal vào tracking list
```

### 3. Tracking Flow (Mỗi 5 phút)
```
1. Lấy danh sách signals đang tracked
2. Lấy giá hiện tại từ Binance
3. Kiểm tra:
   - Chưa hit entry? → Kiểm tra entry
   - Đã hit entry? → Kiểm tra TP/SL
4. Nếu hit TP → Win (lưu vào completed)
5. Nếu hit SL → Lose (lưu vào completed)
6. Cập nhật UI
```

### 4. Daily Summary (23:00)
```
- Tổng hợp tín hiệu trong ngày
- Tính win rate và profit
- Lưu vào database
- Hiển thị trong Statistics
```

## 🛠️ Troubleshooting

### Lỗi "Storage not available"
- Website đang sử dụng fallback storage (in-memory)
- Dữ liệu sẽ mất khi reload trang
- **Giải pháp**: Deploy lên domain thật (không dùng file://)

### Analysis không chạy
- Kiểm tra console logs
- Đảm bảo đã đăng nhập thành công
- Kiểm tra network requests đến Binance API

### Signals không update
- Kiểm tra Analysis Engine đang chạy
- Kiểm tra thời gian hiện tại (5h-21h31)
- Xem console logs để debug

## 🔧 Customization

### Thay đổi coins
Sửa trong `analysis.js`:
```javascript
topCoins: [
    'BTCUSDT',
    'ETHUSDT',
    // Thêm coins khác...
]
```

### Thay đổi confidence threshold
Sửa trong `analysis.js`:
```javascript
const finalConfidence = direction && avgConfidence >= 85 ? 100 : Math.floor(avgConfidence);
// Thay 85 thành giá trị khác
```

### Thay đổi trading levels
Sửa trong `calculateTradingLevels()` function

## 📞 Liên Hệ

- **Facebook**: [Bằng Nguyễn](https://m.facebook.com/bang.nguyen.17040/)
- **Telegram**: [@HOANGDUNGG789](https://t.me/HOANGDUNGG789)

## 📝 License

© Bản quyền thuộc về Bằng Nguyễn

---

## 🎯 Next Steps

1. Deploy code lên GitHub
2. Bật GitHub Pages hoặc deploy lên Render
3. Đăng nhập bằng key `BangAdmin17`
4. Tạo user keys trong Admin Panel
5. Hệ thống sẽ tự động bắt đầu quét và tạo signals

**Lưu ý:** Hệ thống cần chạy liên tục để analysis engine hoạt động. Nên deploy lên platform hỗ trợ 24/7 như Render hoặc Vercel.
