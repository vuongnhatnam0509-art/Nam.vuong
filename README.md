# OceanTrack — visibility nội bộ

Paste **số container / bill / MMSI tàu** → app **gọi API live**. Không có key thì **không có dữ liệu** (trừ nút «Xem mẫu»).

## Dùng repo nào cho live?

| Nguồn | Repo / docs | Live? | Làm được gì | Key |
|---|---|---|---|---|
| **AISStream** | [github.com/aisstream/aisstream](https://github.com/aisstream/aisstream) · [aisstream.io](https://aisstream.io) | Có — WebSocket `wss://stream.aisstream.io/v0/stream` | Vị trí tàu AIS (lat/lng, tốc độ, tên) theo **MMSI 9 số** | Miễn phí, đăng nhập GitHub |
| **SeaRates** | [tracking API](https://www.searates.com/reference/tracking) | Có — REST | Container, bill of lading, lịch tàu POL→POD | Trả phí / trial |
| **ShipsGo** | [shipsgo.com](https://shipsgo.com) | Có — REST | Container / B/L | Trả phí |
| **JSONCargo** | [jsoncargo.com](https://jsoncargo.com) | Có — REST | Đổi tên/IMO tàu → MMSI; container | Trả phí |
| tracktrace (`dhruvkar/tracktrace`) | GitHub 404 | Không | Scrape web hãng — đã chết vì Cloudflare | — |

**MMSI là gì?** Mã nhận dạng radio AIS của tàu, đúng 9 chữ số (Ever Given = `353136000`). Khác số container và khác IMO (7 số). AISStream chỉ lọc theo MMSI — app có sổ tên→MMSI (tự nhớ sau khi bạn tra một lần) và nút «MMSI là gì?» để lưu tàu công ty hay đi.

**AISStream không thay được tracking container.** AIS là tín hiệu radio của tàu, không biết số container trên tàu. Muốn ngày Gate in / Loaded / ETD / ETA / Discharged thì cần SeaRates hoặc ShipsGo.

Luồng gợi ý:

1. Tạo key miễn phí tại [aisstream.io](https://aisstream.io) → `AISSTREAM_API_KEY`
2. (Shipment) tạo key SeaRates → `SEARATES_API_KEY`
3. Tab Tàu: paste MMSI (ví dụ Ever Given `353136000`) → vị trí live từ AISStream
4. Tab Shipment: paste số container/bill → lịch live từ SeaRates; nếu có MMSI tàu thì app bổ sung vị trí AISStream

## Máy công ty (Cursor bị chặn)

```bash
git clone -b cursor/ocean-container-tracking-c40c https://github.com/vuongnhatnam0509-art/Nam.vuong.git
cd Nam.vuong
git pull
npm install
```

Admin tạo file `.env.local` (không commit):

```
AISSTREAM_API_KEY=điền_key
SEARATES_API_KEY=điền_key
```

Chạy cho cả phòng ban trên LAN:

```bash
npm run build
npm run start
```

Máy khác mở `http://IP-MAY-CHU:3000` (cùng mạng). Cần mạng ra được `stream.aisstream.io` (WebSocket) và `tracking.searates.com`.

Hoặc lúc dev: `npm run dev` rồi mở http://localhost:3000

## Dùng hàng ngày

1. Tab **Shipment**: paste số container hoặc bill → bảng ngày giờ + timeline (**cần SeaRates/ShipsGo**)
2. Tàu: paste **tên** (nếu đã có trong sổ), **IMO**, hoặc **MMSI 9 số**. MMSI là mã radio AIS của tàu (không phải số container). Tra MMSI trên VesselFinder rồi lưu «tên → MMSI» trong app. Giữ trang mở để AIS cập nhật.
3. **Danh sách hàng loạt**: dán nhiều số hoặc tải CSV/Excel (tối đa 40) → tra một lúc, có thể «Theo dõi» cả list
4. Tab **Theo dõi**: tự làm mới mỗi 3 phút, cờ đỏ nếu ETA lùi ≥12 giờ hoặc ETA đã quá hạn
5. Tab **Lịch tàu**: POL→POD (**cần SeaRates**)
6. **Xem mẫu** chỉ để xem giao diện — banner vàng = không phải live

App **không phải Project44**: chỉ ocean, không EDI hãng, không air/truck. Muốn shipment live thì cần SeaRates; AISStream không đọc số container.

## GitHub

Code nằm nhánh `cursor/ocean-container-tracking-c40c`. PR: https://github.com/vuongnhatnam0509-art/Nam.vuong/pull/2

Không push file `.env.local` hay `data/watchlist.json`.
