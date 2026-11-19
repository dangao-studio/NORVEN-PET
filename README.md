# 諾文桌寵

諾文小鎮的居民跑到 Windows 桌面上生活。他們會自己走路、坐下、打瞌睡、自言自語，兩個人碰到就聊天或拌嘴。可以戳他們，也可以拎起來再放下。

## 第一次：上傳到 GitHub 並取得安裝檔

1. 在 GitHub 建一個新的 repo（例如 `NORVEN-pet`），公開或私人都可以。
2. 在 repo 頁面按「uploading an existing file」，把這個資料夾**裡面的所有東西**拖進去（包含 `.github` 資料夾），按 Commit。
3. 上傳完會自動開始打包。如果 Actions 分頁空空的，代表 `.github` 資料夾沒傳上去：按「Add file → Create new file」，檔名打 `.github/workflows/build.yml`，把這個資料夾裡同名檔案的內容貼上，按 Commit。到 repo 上方的 **Actions** 分頁，等「打包 Windows 版」變成綠色勾勾（大約 5 到 10 分鐘）。
4. 點進那次執行，最下面的 **Artifacts** 有一個 `NovumPet-Windows`，下載解壓縮，裡面有兩個檔案：
   - `NovumPet-Setup-1.0.0.exe`：安裝版，裝好之後開始選單會有「諾文桌寵」。
   - `NovumPet-Portable-1.0.0.exe`：免安裝，點兩下就能用（每次啟動會慢幾秒）。
5. 第一次執行時 Windows 可能跳出藍色的「已保護您的電腦」，因為程式沒有買數位簽章。按「其他資訊」再按「仍要執行」就好。

> Artifacts 會保留 30 天。過期了，到 Actions 分頁點「打包 Windows 版」再按「Run workflow」重新打包即可。

## 怎麼玩

- **右下角系統匣**有諾文桌寵的圖示：左鍵打開面板，右鍵有選單（躲起來、實況視窗、結束）。
- **面板**
  - 出門：選今天出門到桌面的人，最多 6 個。沒出門的人會顯示他在小鎮裡正在做什麼。
  - 日誌：大家在桌面上聊過的話，以及你不在時小鎮裡發生的事，點開可以看完整對話。
  - 關係：誰跟誰變熟了。只會往好的方向走。
  - 設定：大小、話量、深夜提醒、Zzz、開機自動出現。
- **點一下角色**：戳他。**按住拖曳**：拎起來，放開就會掉回地上。**右鍵角色**：打開「出門」分頁。
- 角色照小鎮的作息過日子，小鎮裡該睡覺的時間，他們在桌面上也會打瞌睡。
- 你離開電腦 30 分鐘以上、電腦睡著、或桌寵關著的期間，小鎮照樣在運轉。回來時右下角會跳出「你不在的時候，小鎮裡發生了幾件事」。

## 實況

系統匣選單選「實況視窗（綠幕）」，會開一個綠色背景的視窗。OBS 加入「視窗擷取」選這個視窗，再加「色度鍵」濾鏡把綠色去掉。

如果這個 repo 有開 GitHub Pages，也可以在 OBS 用「瀏覽器來源」，網址填：
`https://（你的帳號）.github.io/（repo 名稱）/app/stage.html?mode=stream&bg=transparent`
背景會直接是透明的，不用去綠。

## 更新角色資料

桌寵直接沿用諾文小鎮的資料。小鎮那邊新增了事件或改了台詞，把 NORVEN 的這些檔案複製到這裡的 `app/data/` 覆蓋，再上傳一次就會重新打包：

`characters.js`、`locations.js`、`schedules.js`、`events-new.js`、`events-more.js`、`events-solo.js`、`events-original.js`、`voices.js`、`voices-b.js`、`relations.js`、`skins.js`

換了 skin 就把 `icons/skins/` 裡的圖也一起覆蓋。桌面專用的台詞（被戳、被拎起來、深夜提醒）寫在 `app/data/pet-lines.js`。

## 給接手的 AI

- Electron 程式：`main.js`（透明置頂視窗、系統匣、開機啟動）、`preload.js`（`window.pet` 介面）。
- `app/stage.html` + `app/js/stage.js`：桌面舞台。整個工作區是一個透明視窗，滑鼠不在角色身上時會點穿（`setIgnoreMouseEvents` 加 `forward`）。沒有 `window.pet` 時可以直接用瀏覽器開來測試。
- `app/panel.html` + `app/js/panel.js`：控制面板。舞台和面板透過 localStorage 溝通：設定是 `novum-pet-settings`（面板寫），存檔是 `novum-pet-save`（舞台寫）。
- `app/js/pet-core.js`：共用的時間、關係、離開期間的小鎮事件補算（用 `engine.js` 的 `whereabouts` 和 `candidates`）。
- `app/js/blocky.js` 從 NORVEN 複製，加了被拎起來（`held`）和揮手（`wave`）的動作。
- 內容規則跟諾文小鎮一樣：繁體中文、不用破折號、每個人語氣不同、不預設誰喜歡誰、國中生沒有戀愛線、關係只往好的方向走。
- 打包：`.github/workflows/build.yml` 在 GitHub 的 Windows 機器上跑 `electron-builder`，產出安裝版和免安裝版。
