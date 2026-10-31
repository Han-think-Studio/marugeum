# 지금 빠진 그림 16장 — 저장 위치와 프롬프트

그림을 만드는 쪽(코덱스, GPT 등)에 이 문서를 그대로 주면 된다. 핵심은 **파일 이름과 저장 폴더를 정확히** 지키는 것이다.
이름이 다르거나 다른 폴더에 저장되면 게임이 찾지 못한다.

- 저장 폴더: `E:\Game_project\marugeum\public\art\`
- 형식: **PNG**로 저장한다. 이름은 아래 표 그대로, 전부 소문자. (푸시하면 제가 webp로 바꿔 넣는다. 게임은 webp를 읽는다)
- 한 번에 다 못 만들면 있는 것만 먼저 푸시해도 된다. 없는 그림은 게임이 글로 대신한다

## 1. 만드는 쪽에 그대로 붙여 넣는 지시문

```
Generate the 16 images listed below in a monochrome linocut woodblock print style and save each one to the EXACT path given.
Do not rename files, do not add suffixes, do not create subfolders. All file names are lowercase. Format: PNG.

Style for the 11 square icons (512x512): Single object icon, centered, filling most of the frame, monochrome linocut woodblock print style, bold black ink on warm aged paper, high contrast, simplified shapes, one muted gold accent used sparingly, plain uniform aged paper background with no scenery, no text, no letters, no border, square.

Style for the 4 cards (768x512, 3:2) and the 1 band (1536x512, 3:1): Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, simplified shapes, one muted gold accent used sparingly, quiet post-apocalyptic Korean mountains, no text, no letters, no logo, no watermark. People only as silhouettes or from behind, no faces.

1. E:\Game_project\marugeum\public\art\equip-carrier.png (512x512) — A traditional Korean wooden A-frame carrier (jige) with a rope harness, standing upright, empty
2. E:\Game_project\marugeum\public\art\equip-rope.png (512x512) — A coil of thick climbing rope with a carabiner
3. E:\Game_project\marugeum\public\art\equip-flashlight.png (512x512) — A rugged hand flashlight, switched on, with a short cone of light
4. E:\Game_project\marugeum\public\art\equip-mask.png (512x512) — A military gas mask with round eyepieces and a filter canister
5. E:\Game_project\marugeum\public\art\equip-raincoat.png (512x512) — A hooded rain poncho hanging on a nail, dripping
6. E:\Game_project\marugeum\public\art\equip-knife.png (512x512) — A fixed blade field knife in a worn sheath, blade partly drawn
7. E:\Game_project\marugeum\public\art\equip-iodine.png (512x512) — A small brown medicine bottle with a few white tablets beside it
8. E:\Game_project\marugeum\public\art\equip-medkit.png (512x512) — A canvas first aid pouch with a cross symbol, open, bandages inside
9. E:\Game_project\marugeum\public\art\equip-purifier.png (512x512) — A blister strip of water purification tablets next to a canteen cup
10. E:\Game_project\marugeum\public\art\equip-matches.png (512x512) — A small sealed tin of waterproof matches, one match struck
11. E:\Game_project\marugeum\public\art\obj-toolshed.png (512x512) — A small rural tool shed with a half open corrugated door, a hoe and a wooden carrier visible inside
12. E:\Game_project\marugeum\public\art\camp-tent.png (768x512) — A small dome tent pitched on a rocky ridge, corners weighed down with stones, a plastic sheet tucked between boulders beside it, wide 3:2 composition
13. E:\Game_project\marugeum\public\art\camp-cave.png (768x512) — The mouth of a shallow rock cave with a bed of dry branches inside, a few supplies stacked in a hollow by the entrance, faint firelight, wide 3:2 composition
14. E:\Game_project\marugeum\public\art\camp-house.png (768x512) — The inside of an abandoned mountain hut turned into a shelter, boarded window, sleeping mat, a lantern and stacked cans on a shelf, wide 3:2 composition
15. E:\Game_project\marugeum\public\art\mark-secured.png (768x512) — A small campfire ring of stacked stones with embers glowing, next to it a stick marker tied with a strip of cloth, on a ridge at dawn, wide 3:2 composition
16. E:\Game_project\marugeum\public\art\event-scout.png (1536x512) — A lone figure with a backpack standing on a rocky ridge shading their eyes, looking north into layered mountains and haze, a thin line of smoke far away, wide 3:1 composition

After saving, list the 16 paths and confirm each file exists.
```

## 2. 표로 보기

| # | 파일 (public\art\ 안) | 크기 | 어디에 쓰이나 |
|---|---|---|---|
| 1 | equip-carrier.png | 512×512 | 거점 화면 장비 목록 · 지게 |
| 2 | equip-rope.png | 512×512 | 밧줄 |
| 3 | equip-flashlight.png | 512×512 | 손전등 |
| 4 | equip-mask.png | 512×512 | 방독면 |
| 5 | equip-raincoat.png | 512×512 | 우비 |
| 6 | equip-knife.png | 512×512 | 칼 |
| 7 | equip-iodine.png | 512×512 | 요오드 |
| 8 | equip-medkit.png | 512×512 | 구급낭 |
| 9 | equip-purifier.png | 512×512 | 정수 알약 |
| 10 | equip-matches.png | 512×512 | 방수 성냥 |
| 11 | obj-toolshed.png | 512×512 | 장면 위 사물 표식 · 농기구 창고 |
| 12 | camp-tent.png | 768×512 | 장면 왼쪽 위 '지은 것' 칸 · 텐트 거점 |
| 13 | camp-cave.png | 768×512 | 바위굴 거점 |
| 14 | camp-house.png | 768×512 | 집 거점 |
| 15 | mark-secured.png | 768×512 | 안정된 자리 표식 (21단계 예정) |
| 16 | event-scout.png | 1536×512 | 정찰 결과 띠 그림 (21단계 예정) |

## 3. 저장이 됐는지 확인 (파워셸에 붙여 넣기)

```powershell
Set-Location "E:\Game_project\marugeum"
$names = "equip-carrier","equip-rope","equip-flashlight","equip-mask","equip-raincoat","equip-knife","equip-iodine","equip-medkit","equip-purifier","equip-matches","obj-toolshed","camp-tent","camp-cave","camp-house","mark-secured","event-scout"
foreach ($n in $names) { $f = Get-ChildItem "public\art\$n.*" -ErrorAction SilentlyContinue | Select-Object -First 1; if ($f) { "있음  $($f.Name)  $([math]::Round($f.Length/1KB)) KB" } else { "없음  $n" } }
```

## 4. 이미 만들었는데 어디 갔는지 모를 때 (최근 사흘 안에 생긴 그림 파일 찾기)

```powershell
Get-ChildItem "E:\Game_project", "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Pictures" -Recurse -Include *.png,*.webp,*.jpg -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-3) } | Sort-Object LastWriteTime -Descending | Select-Object -First 40 FullName, LastWriteTime
```

찾았으면 이름을 위 표대로 바꿔 `E:\Game_project\marugeum\public\art\` 로 옮긴다.

## 5. 올리기

```powershell
Set-Location "E:\Game_project\marugeum"; git add public/art; git commit -m "그림 16장"; git push
```

푸시가 끝나면 말해 주면 된다. 받아서 webp로 바꾸고, 게임 화면에 붙은 것을 스크린샷으로 확인해 드린다.
