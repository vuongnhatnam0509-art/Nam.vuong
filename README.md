# OceanTrack — visibility nội bộ (kiểu Project44)

Paste **số container / bill / tàu** → ra **ngày giờ** (ETD/ATD, ETA/ATA, gate in, loaded, discharged). Có tab **Lịch tàu** POL→POD.

Hãng tàu không mở JSON public. App lấy live qua **SeaRates** (tracking + schedules), giống các nền tảng visibility.

## Máy công ty (Cursor bị chặn)

```bash
git clone -b cursor/ocean-container-tracking-c40c https://github.com/vuongnhatnam0509-art/Nam.vuong.git
cd Nam.vuong
git pull
npm install
```

Admin tạo file `.env.local` (không commit):

```
SEARATES_API_KEY=điền_key
```

Đăng ký key: https://www.searates.com/reference/tracking (tracking) và schedules cùng tài khoản nếu có.

Chạy cho cả phòng ban trên LAN:

```bash
npm run build
npm run start
```

Máy khác mở `http://IP-MAY-CHU:3000` (cùng mạng). Mọi người **chỉ paste số** — không cần Cursor, không cần dán key.

Hoặc lúc dev: `npm run dev` rồi mở http://localhost:3000

## Dùng hàng ngày

1. Tab **Shipment**: paste số container hoặc bill → bảng ngày giờ + timeline
2. Bấm **Theo dõi** để các phòng cùng thấy trên tab Theo dõi
3. Tab **Lịch tàu**: chọn cảng đi/đến (ví dụ VNSGN → NLRTM) → ETD/ETA mới nhất

## GitHub

Code nằm nhánh `cursor/ocean-container-tracking-c40c`. PR: https://github.com/vuongnhatnam0509-art/Nam.vuong/pull/2

Không push file `.env.local` hay `data/watchlist.json`.
