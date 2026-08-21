# OceanTrack

App web tra cứu **container**, **bill of lading** và **tàu** — nhập một mã, nhận hành trình, ETA và vị trí AIS.

## Thư viện mở mà app dựa trên

Repo GitHub kinh điển cho việc này là [`dhruvkar/tracktrace`](https://github.com/dhruvkar/tracktrace) (PyPI: `tracktrace`): nhận số container + SCAC, gọi từng hãng tàu (MSC, CMA CGM, Hapag-Lloyd, ONE, …) rồi trả timeline thống nhất.

Hai hướng mở khác thường được nhắc tới:

- [DCSA Track & Trace](https://github.com/dcsaorg) — chuẩn API mở của ngành (Maersk, Hapag-Lloyd, ONE… triển khai). Vẫn cần credential từng hãng.
- [`castro-aduaneira/container-tracker`](https://github.com/castro-aduaneira/container-tracker) — nền tảng tracking đầy đủ, nặng hơn một app tra cứu.

`tracktrace` gần như không còn chạy được: website hãng tàu (Maersk, MSC, …) chặn scraper bằng Cloudflare/Akamai, và repo GitHub gốc hiện 404. OceanTrack giữ cách làm của tracktrace (nhận diện ISO 6346, map prefix → hãng, timeline chung) nhưng lấy dữ liệu live qua API:

| Nguồn | Dùng khi | Tra cứu |
| --- | --- | --- |
| [JSONCargo](https://jsoncargo.com) | `JSONCARGO_API_KEY` | Container, B/L, tàu (AIS) |
| [ShipsGo](https://shipsgo.com) | `SHIPSGO_AUTH_CODE` | Container, B/L (phổ biến ở VN) |
| Demo | không có key | `MSKU3900520`, `MAEU918273645`, `MAERSK ESSEN`, `EVER GIVEN` |

Không có key thì app vẫn chạy với dữ liệu mẫu và luôn đưa link trang chính thức của hãng.

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
```

## Biến môi trường

Xem `.env.example`.

- JSONCargo: đăng ký plan, lấy API key, dán vào `JSONCARGO_API_KEY`.
- ShipsGo: lấy `authCode` trên dashboard, dán vào `SHIPSGO_AUTH_CODE`.

Hãng hỗ trợ (JSONCargo): Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE, Evergreen, COSCO, HMM, Yang Ming, ZIM, PIL.

## API nội bộ

```bash
curl -X POST http://localhost:3000/api/track \
  -H 'content-type: application/json' \
  -d '{"query":"MSKU3900520","kind":"auto"}'
```

`kind`: `auto` | `container` | `bl` | `vessel`. Có thể thêm `carrier` (`MAERSK`, `MSC`, …) khi prefix container là thùng thuê (TCLU, TEMU, …).

## Nhận diện mã

- Container ISO 6346: 4 chữ (kết thúc `U`/`J`/`Z`) + 7 số, ví dụ `MSKU3900520` → Maersk
- Bill of lading: chuỗi chữ/số 6–20 ký tự
- Tàu: tên (`MAERSK ESSEN`), IMO 7 số, hoặc MMSI 9 số
