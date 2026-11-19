/* 諾文小鎮：地點與分區
 * region / page 決定它出現在哪一張街區圖、哪一頁。
 * slot 是在街區圖 2×3 格中的位置（0~5，由左至右、由上而下）。
 * kind: public 公共地點／home 住處／external 聯外目的地
 */
window.NOVUM = window.NOVUM || {};

NOVUM.regions = [
  { id: "central", name: "中央", sub: "生活區", map: "central",
    pages: ["鐘塔一帶", "住宅巷與公園"] },
  { id: "academy", name: "學院", sub: "與資料區", map: "academy",
    pages: ["校園與宿舍", "資料街"] },
  { id: "oldtown", name: "舊城", sub: "與河岸", map: "oldtown",
    pages: ["舊城街巷", "河岸"] },
  { id: "outer", name: "外城", sub: "聯絡區", map: "outer",
    pages: ["轉運與工坊", "列車可達：佩洛", "列車可達：其他城市"] }
];

NOVUM.locations = [
  // ── 中央生活區・鐘塔一帶
  { id: "史威特偵探社", name: "史威特偵探社", icon: "🔎", region: "central", page: 0, slot: 0, kind: "public",
    desc: "掛著燈串的老樓。二樓有史威特住的休息室。" },
  { id: "Hale’s Oven", name: "Hale’s Oven", icon: "🥖", region: "central", page: 0, slot: 1, kind: "public",
    desc: "海爾的餐館，店後是他的住處。週一公休。" },
  { id: "諾文鐘塔廣場", name: "鐘塔廣場", icon: "🕰️", region: "central", page: 0, slot: 2, kind: "public",
    desc: "四面鐘的鐘塔，影子有時會多出一道。" },
  { id: "諾文甜點店", name: "甜點店", icon: "🍩", region: "central", page: 0, slot: 3, kind: "public",
    desc: "露天座位曬得到早上的太陽。" },
  { id: "諾文轉角騎樓", name: "轉角騎樓", icon: "☂️", region: "central", page: 0, slot: 4, kind: "public",
    desc: "老書報攤與尋人啟事，下雨天最熱鬧。" },
  { id: "天使的閣樓", name: "天使的閣樓", icon: "🪽", region: "central", page: 0, slot: 5, kind: "home",
    desc: "鐘塔旁的斜屋頂小閣樓。人間天使的住處。" },

  // ── 中央生活區・住宅巷與公園
  { id: "諾文公園", name: "諾文公園", icon: "🌳", region: "central", page: 1, slot: 0, kind: "public",
    desc: "噴水池和長椅，樹影會唱歌（據說）。" },
  { id: "諾文生活區", name: "生活區巷口", icon: "🏘️", region: "central", page: 1, slot: 1, kind: "public",
    desc: "市場、路邊攤和貼滿尋物啟事的佈告欄。" },
  { id: "諾文夜市", name: "諾文夜市", icon: "🏮", region: "central", page: 1, slot: 2, kind: "public",
    desc: "晚上才熱鬧，拉麵攤的湯底很濃。" },
  { id: "佐代的公寓", name: "佐代的公寓", icon: "🏢", region: "central", page: 1, slot: 3, kind: "home",
    desc: "佐代的住處，白也住在這裡。" },
  { id: "神崎家", name: "神崎家", icon: "🏠", region: "central", page: 1, slot: 4, kind: "home",
    desc: "櫻子與黑子的家。" },
  { id: "星星家", name: "星星家", icon: "🏡", region: "central", page: 1, slot: 5, kind: "home",
    desc: "星星的家。" },

  // ── 學院與資料區・校園與宿舍
  { id: "沙布堤亞大學", name: "沙布堤亞大學", icon: "🏛️", region: "academy", page: 0, slot: 0, kind: "public",
    desc: "魔法理論與各科系的大學，附設圖書館。" },
  { id: "艾比所高中", name: "艾比所高中", icon: "🥁", region: "academy", page: 0, slot: 1, kind: "public",
    desc: "金屬工藝科和音樂教室很有名。" },
  { id: "蓋亞中學", name: "蓋亞中學", icon: "🏫", region: "academy", page: 0, slot: 2, kind: "public",
    desc: "黑子和櫻子的學校。" },
  { id: "沙布堤亞宿舍", name: "沙布堤亞宿舍", icon: "🛏️", region: "academy", page: 0, slot: 3, kind: "home",
    desc: "大學宿舍。沏萊爾住在這裡。" },
  { id: "艾比所工科宿舍", name: "工科宿舍", icon: "🔩", region: "academy", page: 0, slot: 4, kind: "home",
    desc: "艾比所高中的宿舍。何禹瀧住在這裡。" },
  { id: "梅魯塔的塔屋", name: "教職員塔屋", icon: "🦉", region: "academy", page: 0, slot: 5, kind: "home",
    desc: "大學旁的教職員塔屋。梅魯塔與貓頭鷹的住處。" },

  // ── 學院與資料區・資料街
  { id: "諾文聯邦圖書館", name: "聯邦圖書館", icon: "📚", region: "academy", page: 1, slot: 0, kind: "public",
    desc: "地下書庫的書會自己換位置。" },
  { id: "諾文聯邦資料館", name: "聯邦資料館", icon: "🗄️", region: "academy", page: 1, slot: 1, kind: "public",
    desc: "收藏不同紀元層的材料與紀錄。" },
  { id: "諾文古神話展館", name: "古神話展館", icon: "🏺", region: "academy", page: 1, slot: 2, kind: "public",
    desc: "EL-2 遺跡的石碑與符號。" },
  { id: "城東學區", name: "城東學區", icon: "🎒", region: "academy", page: 1, slot: 3, kind: "public",
    desc: "其他國中所在的學區。星星的學校。" },

  // ── 舊城與河岸・舊城街巷
  { id: "諾文舊街", name: "舊街", icon: "🚪", region: "oldtown", page: 0, slot: 0, kind: "public",
    desc: "門會換位置、招牌會換文字的老街。" },
  { id: "諾文混合書街", name: "混合書街", icon: "📖", region: "oldtown", page: 0, slot: 1, kind: "public",
    desc: "二手書店一間接一間，書架高得要用梯子。" },
  { id: "諾文古籍巷", name: "古籍巷", icon: "📜", region: "oldtown", page: 0, slot: 2, kind: "public",
    desc: "古書與禁書攤，老闆總在打瞌睡。" },
  { id: "諾文石造街區", name: "石造街區", icon: "🧱", region: "oldtown", page: 0, slot: 3, kind: "public",
    desc: "EL-3 留下的古牆，上面接著訊號線。" },
  { id: "諾文舊物市場", name: "舊物市場", icon: "🪞", region: "oldtown", page: 0, slot: 4, kind: "public",
    desc: "古董、寶石和會回禮的鏡子。" },
  { id: "禮的家", name: "禮的家", icon: "🕯️", region: "oldtown", page: 0, slot: 5, kind: "home",
    desc: "古籍巷樓上，架上有動物標本。" },

  // ── 舊城與河岸・河岸
  { id: "諾文河岸步道", name: "河岸步道", icon: "🌉", region: "oldtown", page: 1, slot: 0, kind: "public",
    desc: "霧低的夜晚，路燈看起來比平常遠。" },
  { id: "諾文地下湖", name: "地下湖", icon: "🎣", region: "oldtown", page: 1, slot: 1, kind: "public",
    desc: "從河岸階梯往下的地下水域，瑞特的釣場。" },
  { id: "諾文服飾街", name: "服飾街", icon: "👕", region: "oldtown", page: 1, slot: 2, kind: "public",
    desc: "河岸邊的小店街，有很多好笑圖案的 T-shirt。" },
  { id: "玫君的租屋", name: "玫君的租屋", icon: "🎧", region: "oldtown", page: 1, slot: 3, kind: "home",
    desc: "牆有點薄的出租公寓。" },
  { id: "瑞特的租屋", name: "瑞特的租屋", icon: "🪝", region: "oldtown", page: 1, slot: 4, kind: "home",
    desc: "河岸東側的租屋，門口晾著釣具。" },

  // ── 外城聯絡區・轉運與工坊
  { id: "諾文轉運站", name: "轉運站", icon: "🚉", region: "outer", page: 0, slot: 0, kind: "public",
    desc: "老式車窗配全息看板的電車在這裡停靠。" },
  { id: "諾文舊站", name: "舊站", icon: "🚂", region: "outer", page: 0, slot: 1, kind: "public",
    desc: "EL-5 蒸氣列車的月台。" },
  { id: "諾文機械工作坊", name: "機械工作坊", icon: "🛠️", region: "outer", page: 0, slot: 2, kind: "public",
    desc: "大工作台可以借用，記得不要把麵碗放上去。" },
  { id: "諾文機械市集", name: "機械市集", icon: "⚙️", region: "outer", page: 0, slot: 3, kind: "public",
    desc: "二手零件攤一路排到巷尾。" },
  { id: "諾文科技維修站", name: "科技維修站", icon: "📻", region: "outer", page: 0, slot: 4, kind: "public",
    desc: "櫃台後面堆滿待修的家電。" },
  { id: "諾文立體街廊", name: "立體街廊", icon: "🏙️", region: "outer", page: 0, slot: 5, kind: "public",
    desc: "十二層的立體商店街，升降梯偶爾罷工。" },

  // ── 外城聯絡區・列車可達：佩洛
  { id: "佩洛・表演廣場", name: "佩洛・表演廣場", icon: "🎤", region: "outer", page: 1, slot: 0, kind: "external",
    desc: "佩洛的街頭表演廣場，旁邊有拉麵攤。" },
  { id: "佩洛・塗鴉街", name: "佩洛・塗鴉街", icon: "🎨", region: "outer", page: 1, slot: 1, kind: "external",
    desc: "有合法塗鴉區的街道。" },
  { id: "癇癪的住處", name: "佩洛・癇癪的住處", icon: "🔧", region: "outer", page: 1, slot: 2, kind: "home",
    desc: "佩洛生活圈裡的住處。" },
  { id: "ミニクイ的住處", name: "佩洛・ミニクイ的住處", icon: "🍜", region: "outer", page: 1, slot: 3, kind: "home",
    desc: "冰箱門上貼滿拉麵集點卡。" },

  // ── 外城聯絡區・列車可達：其他城市
  { id: "メクタ・改裝街", name: "メクタ・改裝街", icon: "🦾", region: "outer", page: 2, slot: 0, kind: "external",
    desc: "メクタ的機械改裝店街。" },
  { id: "メクタ・材料街", name: "メクタ・材料街", icon: "🏭", region: "outer", page: 2, slot: 1, kind: "external",
    desc: "工廠區旁的廢料與材料街。" },
  { id: "維塔・草藥市集", name: "維塔・草藥市集", icon: "🌿", region: "outer", page: 2, slot: 2, kind: "external",
    desc: "維塔的香草與草藥市集。" },
  { id: "奧克托拉・研究展示區", name: "奧克托拉・研究展示區", icon: "🐙", region: "outer", page: 2, slot: 3, kind: "external",
    desc: "奧克托拉的水下研究展示長廊。" }
];

/* 事件資料裡的地點別名 → 實際地點 */
NOVUM.locationAlias = {
  "艾比所高中・音樂教室": "艾比所高中"
};
