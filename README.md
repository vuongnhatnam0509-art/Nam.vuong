# OceanTrack

Paste **số container**, **bill of lading** hoặc **tàu** → hành trình live từ hãng tàu.

Hãng tàu (Maersk, MSC, …) không mở JSON công khai. App gọi aggregator **một lần key**, sau đó chỉ việc paste số.

## Chạy trên máy công ty

Tải nhánh `cursor/ocean-container-tracking-c40c` (không phải `main`):

```bash
git clone -b cursor/ocean-container-tracking-c40c https://github.com/vuongnhatnam0509-art/Nam.vuong.git
cd Nam.vuong
npm install
npm run dev
```

Mở http://localhost:3000

1. Bấm **Cài đặt API**
2. Dán **một** key:
   - [SeaRates](https://www.searates.com/reference/tracking) — nên dùng: tự nhận hãng, container + bill + vị trí AIS của tàu
   - hoặc [ShipsGo](https://shipsgo.com) — phổ biến ở VN (container/bill)
   - [JSONCargo](https://jsoncargo.com) — thêm nếu cần tìm tàu theo tên/IMO
3. Paste số container / bill / tàu rồi **Tra cứu**

Key lưu trên máy (localStorage hoặc `.env.local`), không commit lên GitHub.

## Vì sao cần key

Thư viện mở cũ [`tracktrace`](https://github.com/dhruvkar/tracktrace) scrape website hãng. Hiện Maersk/MSC/SeaRates chặn Cloudflare. Cách ổn định duy nhất: API aggregator.

| Key | Container | Bill | Tàu theo tên/IMO | AIS trên chuyến |
| --- | --- | --- | --- | --- |
| SeaRates | có | có | không | có |
| ShipsGo | có | có | không | có (mapPoint) |
| JSONCargo | có | có (cần chọn hãng) | có | có |

## API nội bộ

```bash
curl -X POST http://localhost:3000/api/track \
  -H 'content-type: application/json' \
  -d '{"query":"MSKU3900520","kind":"auto","keys":{"searates":"YOUR_KEY"}}'
```

`kind`: `auto` | `container` | `bl` | `vessel`
