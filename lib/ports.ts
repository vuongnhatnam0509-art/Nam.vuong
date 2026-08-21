export type Port = {
  locode: string;
  name: string;
  country: string;
};

export const PORTS: Port[] = [
  { locode: "VNSGN", name: "TP.HCM / Cát Lái", country: "VN" },
  { locode: "VNVUT", name: "Vũng Tàu / Cái Mép", country: "VN" },
  { locode: "VNHPH", name: "Hải Phòng", country: "VN" },
  { locode: "VNDAD", name: "Đà Nẵng", country: "VN" },
  { locode: "SGSIN", name: "Singapore", country: "SG" },
  { locode: "CNSHA", name: "Shanghai", country: "CN" },
  { locode: "CNSHK", name: "Shekou / Shenzhen", country: "CN" },
  { locode: "CNNGB", name: "Ningbo", country: "CN" },
  { locode: "HKHKG", name: "Hong Kong", country: "HK" },
  { locode: "KRPUS", name: "Busan", country: "KR" },
  { locode: "JPTYO", name: "Tokyo", country: "JP" },
  { locode: "JPYOK", name: "Yokohama", country: "JP" },
  { locode: "TWKHH", name: "Kaohsiung", country: "TW" },
  { locode: "THLCH", name: "Laem Chabang", country: "TH" },
  { locode: "MYPKG", name: "Port Klang", country: "MY" },
  { locode: "USLAX", name: "Los Angeles", country: "US" },
  { locode: "USLGB", name: "Long Beach", country: "US" },
  { locode: "USNYC", name: "New York", country: "US" },
  { locode: "NLRTM", name: "Rotterdam", country: "NL" },
  { locode: "DEHAM", name: "Hamburg", country: "DE" },
  { locode: "BEANR", name: "Antwerp", country: "BE" },
  { locode: "GBFXT", name: "Felixstowe", country: "GB" },
  { locode: "FRLEH", name: "Le Havre", country: "FR" },
  { locode: "ITGOA", name: "Genoa", country: "IT" },
  { locode: "AEJEA", name: "Jebel Ali", country: "AE" },
];

export function findPort(value: string): Port | undefined {
  const needle = value.trim().toUpperCase();
  return PORTS.find(
    (port) =>
      port.locode === needle ||
      port.name.toUpperCase().includes(needle) ||
      needle.includes(port.locode),
  );
}
