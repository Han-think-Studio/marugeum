# 마루금 그림 3차 목록 — 빠진 것 전부와 새로 필요한 것 전부

2026-11-03 기준. 코드가 찾는데 없는 그림(A)과, UI·손 놀이·엔딩·스토어까지 새로 들어가면 좋은 그림(B~F)을 한 문서에 모았다.
그림을 만드는 쪽(GPT 등)에 **묶음별 코드 블록을 그대로 붙여 넣으면** 된다. 한 번에 10장 안팎씩 나눠 요청하는 게 안전하다.

- 저장 폴더: 게임 그림은 `E:\Game_project\marugeum\public\art\`, 스토어 그림은 `E:\Game_project\marugeum\store\`
- 형식: **PNG**. 이름은 표 그대로, 전부 소문자. 푸시하면 webp로 바꿔 넣는다 (게임은 webp를 읽는다)
- 그림체 기준: `public\art\scene-start` (중산리 야영장). 요청할 때 이 그림을 참고 이미지로 함께 주면 결이 맞는다
- 없는 그림은 게임이 글자나 비슷한 그림으로 대신하니, 있는 것부터 조금씩 넣어도 된다
- 지금 빠진 그림은 언제든 `node tools/art-missing.cjs` 로 다시 셀 수 있다 (코드가 찾는 그림만 센다)

| 묶음 | 장수 | 코드 연결 | 우선 |
|---|---|---|---|
| A. 지금 빠진 그림 (코드가 이미 찾는다) | 22 | 넣기만 하면 뜬다 | ★★★ |
| B. 손 놀이 바탕과 도구 | 13 | 넣으면 제가 잇는다 | ★★★ |
| C. UI 아이콘 (수치·탭·날씨·고비·리본·숨은 것) | 24 | 넣으면 제가 잇는다 | ★★ |
| D. UI 바탕과 글자 (제목 글자, 종이 결, 수첩, 지도 바탕) | 4 | 넣으면 제가 잇는다 | ★★ |
| E. 엔딩과 죽음, 숨은 장면 | 8 | 넣으면 제가 잇는다 | ★★ |
| F. 스토어 (스팀·itch.io·공유 카드) | 10 | 번들에 안 들어간다 | ★ (출시 전) |
| 합계 | 81 | | |

## 공통 그림체 (모든 묶음 맨 앞에 붙는다)

- **장면·띠·카드**: Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, simplified shapes, one muted gold accent used sparingly, quiet post-apocalyptic Korean mountains, no text, no letters, no logo, no watermark. People only as silhouettes or seen from behind, no faces.
- **물건 아이콘 (512×512)**: Single object icon, centered, filling most of the frame, monochrome linocut woodblock print style, bold black ink on warm aged paper, high contrast, simplified shapes, one muted gold accent used sparingly, plain uniform aged paper background with no scenery, no text, no border, square.
- **UI 아이콘·도구 조각 (투명)**: Bold simplified silhouette icon in carved linocut style, black ink with one muted gold accent, readable at 24 pixels, isolated on a fully transparent background (PNG with alpha), no paper background, no text, no border.

---

## A. 지금 빠진 그림 22장 — 넣기만 하면 바로 뜬다 ★★★

### A-1. 사건 삽화 10장 (1536×512, 3:1 띠)

```
Generate each image below and save it to the EXACT path. Do not rename, no suffixes, no subfolders. Lowercase names. PNG.
Style for every image: Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, simplified shapes, one muted gold accent used sparingly, quiet post-apocalyptic Korean mountains, no text, no letters, no logo, no watermark. People only as silhouettes or seen from behind, no faces. Wide 3:1 banner composition, 1536x512.

1. E:\Game_project\marugeum\public\art\event-tut_carrier.png — A lone hiker seen from behind carrying a traditional Korean wooden A-frame carrier (jige) loaded with a tent and fuel cans, leaning forward on a steep mountain trail, the load towering above the head
2. E:\Game_project\marugeum\public\art\event-tut_charges.png — Close still life on a flat rock: a small brown iodine bottle with a few tablets, a canvas first aid pouch with a cross, a blister strip of water purification tablets, a hand counting them, mountain haze behind
3. E:\Game_project\marugeum\public\art\event-suyeon_neuljae.png — A small Korean village shrine (seonghwangdang) at a mountain pass, a straw rope strung between poles with many folded paper prayer notes tied on it fluttering, one dry note under the eaves, a cairn beside it
4. E:\Game_project\marugeum\public\art\event-suyeon_hwabang.png — Inside an abandoned highway rest stop washroom, a large mirror with big handwritten lipstick letters as abstract strokes (not readable), a child's crayon drawing of three round heads with stick legs taped below it, a figure from behind looking into the mirror
5. E:\Game_project\marugeum\public\art\event-suyeon_noinbong.png — Inside a small wooden mountain hut, an old framed portrait of a hut keeper on the wall, beside it a child's crayon drawing of three mountains and a tall walking figure pinned with a thumbtack, chalk marks on the door
6. E:\Game_project\marugeum\public\art\event-past_cairn.png — A knee-high cairn of stacked stones beside a ridge trail, the flat top stone scratched with a single knife line, a scrap of cloth peeking out from under the stones, morning mist, a pair of boots of a figure standing before it
7. E:\Game_project\marugeum\public\art\event-hidden_compass.png — A wooden desk drawer pulled open in a dim mountain hut, handwritten wind notes carved and scribbled on the inside of the drawer, an old brass compass wrapped in paper glowing faintly gold
8. E:\Game_project\marugeum\public\art\event-hidden_codebook.png — A military radio barracks on a mountaintop under a steel antenna tower, a desk with two open logbooks side by side and a small palm-sized notebook of frequency tables, a radio set, cold light through a small window
9. E:\Game_project\marugeum\public\art\event-hidden_beads.png — An old Buddhist monk seen from behind sitting under a slender stone pagoda on a mountainside temple, holding out a string of wooden prayer beads toward a hiker's open hand, quiet evening
10. E:\Game_project\marugeum\public\art\event-hidden_numbers.png — Inside a military signal tent at a mountain pass at night, a field radio with a glowing dial, pages of handwritten number columns spread on a crate, a soldier's silhouette and a hiker's silhouette leaning over them, a lantern
```

### A-2. 숨은 물건 3장 (512×512 물건 아이콘)

```
Save each image to the EXACT path. Lowercase names, PNG, 512x512.
Style: Single object icon, centered, filling most of the frame, monochrome linocut woodblock print style, bold black ink on warm aged paper, high contrast, simplified shapes, one muted gold accent used sparingly, plain uniform aged paper background with no scenery, no text, no border, square.

11. E:\Game_project\marugeum\public\art\equip-compass.png — An old brass pocket compass with the lid open, the needle pointing up, a folded paper note tucked under it
12. E:\Game_project\marugeum\public\art\equip-codebook.png — A small worn military notebook open to a grid of number tables, a pencil clipped to it, a radio frequency dial sketch on one page (no readable text)
13. E:\Game_project\marugeum\public\art\equip-beads.png — A loop of wooden Buddhist prayer beads (108 beads) with a small tassel, coiled on itself
```

### A-3. 자리 장면 2장 (1600×900, 16:9)

```
Save each image to the EXACT path. Lowercase names, PNG, 1600x900.
Style: Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, simplified shapes, one muted gold accent used sparingly, quiet post-apocalyptic Korean mountains, no text, no letters, no logo, no watermark. People only as silhouettes or from behind, no faces. Wide 16:9 composition with open ground in the lower third for small markers.

14. E:\Game_project\marugeum\public\art\scene-place-jungsanri-wide.png — Jungsanri campground at the southern foot of Jirisan at dawn: a few abandoned tents, a small wooden ranger hut, a bare flagpole, parked cars left behind, fuel cans, Jirisan ridge behind, a small gold sunrise
15. E:\Game_project\marugeum\public\art\scene-place-hyangno-wide.png — Hyangnobong summit refugee camp at the edge of the DMZ: rows of military tents, a radio antenna, a helicopter pad with lights, a double barbed-wire fence running over the ridge, beyond the fence a visibly greener untouched mountain range, warm generator lights
```

### A-4. 행동 아이콘 7장 (512×512, 투명 배경)

행동 탭의 버튼 그림. 지금은 비슷한 그림을 빌려 쓰거나 한자 한 글자로 뜬다.

```
Save each image to the EXACT path. Lowercase names, PNG with transparent background, 512x512.
Style: Bold simplified icon in carved linocut style, black ink with one muted gold accent, readable at 24 pixels, centered, isolated on a fully transparent background (alpha), no paper background, no text, no border.

16. E:\Game_project\marugeum\public\art\icon-photo.png — A small worn family photograph with a bent corner, a folded note tucked behind it
17. E:\Game_project\marugeum\public\art\icon-cook.png — A small camping pot with steam rising over a campfire
18. E:\Game_project\marugeum\public\art\icon-purifier.png — A water purification tablet dropping into a canteen cup with bubbles
19. E:\Game_project\marugeum\public\art\icon-windbreak.png — A low curved wall of stacked stones and branches with wind lines bending around it
20. E:\Game_project\marugeum\public\art\icon-iodine.png — A small brown pill bottle with one tablet in front of it and a tiny radiation trefoil
21. E:\Game_project\marugeum\public\art\icon-medkit.png — A canvas first aid pouch with a cross and a rolled bandage
22. E:\Game_project\marugeum\public\art\icon-radio.png — A small portable transistor radio with an extended antenna and sound waves
```

---

## B. 손 놀이 바탕과 도구 13장 ★★★

지금 손 놀이(망치질·드라이버·성냥 긋기·국 끓이기)는 막대와 도형으로만 그린다. 바탕 4장 위에 도구 조각 9장을 얹어 움직인다.
바탕은 놀이 칸 비율(3:1) 그대로, 아래쪽 1/4은 막대가 올라가니 비워 둔다.

```
Save each image to the EXACT path. Lowercase names, PNG.
Backdrop style (1560x520, 3:1): Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, one muted gold accent used sparingly, close-up still life, no people, no text. Keep the bottom quarter plain and dark for an overlay bar.
Sprite style (512x512, transparent): Single tool or object in carved linocut style, black ink with muted gold accent, isolated on a fully transparent background (alpha), centered, no shadow, no text.

1. E:\Game_project\marugeum\public\art\hand-bg-hammer.png (1560x520) — A rough wooden workbench plank seen from the front at eye level, wood grain, a few old nail holes, a coil of rope and a tin cup at the far edge, dim hut interior behind
2. E:\Game_project\marugeum\public\art\hand-bg-screw.png (1560x520) — The open metal side panel of an old generator or radio seen straight on, three screw holes in a row, wires and a small circuit board inside, a work lamp's warm light
3. E:\Game_project\marugeum\public\art\hand-bg-match.png (1560x520) — Low stone fire ring with dry kindling stacked inside, on an exposed mountain ridge at dusk, grass bent by wind, wind lines across the sky
4. E:\Game_project\marugeum\public\art\hand-bg-cook.png (1560x520) — A small campfire ring of stones in front of a tent at night, a flat cooking stone, the dark mountain silhouette behind, sparks
5. E:\Game_project\marugeum\public\art\hand-hammer.png (512x512, transparent) — A claw hammer with a worn wooden handle, head pointing upper left, diagonal
6. E:\Game_project\marugeum\public\art\hand-nail.png (512x512, transparent) — A single long iron nail standing upright, flat head on top
7. E:\Game_project\marugeum\public\art\hand-screwdriver.png (512x512, transparent) — A flat-head screwdriver with a wooden handle, pointing down vertically
8. E:\Game_project\marugeum\public\art\hand-screw.png (512x512, transparent) — A round cross-head screw seen from the top, centered, as a circle
9. E:\Game_project\marugeum\public\art\hand-matchbox.png (512x512, transparent) — A small Korean matchbox half open with matches inside, a strike strip on the side
10. E:\Game_project\marugeum\public\art\hand-match.png (512x512, transparent) — A single wooden match standing upright, unlit, red head on top
11. E:\Game_project\marugeum\public\art\hand-flame.png (512x512, transparent) — A small match flame shape, teardrop of fire with a bright gold core, no match stick
12. E:\Game_project\marugeum\public\art\hand-pot.png (512x512, transparent) — A dented aluminum camping pot with a wire handle, seen from the side, slightly tilted lid
13. E:\Game_project\marugeum\public\art\hand-fire.png (512x512, transparent) — A small campfire of crossed logs with flames, seen from the side, flames centered
```

---

## C. UI 아이콘 24장 (256×256, 투명 배경) ★★

상단 표시줄·몸 탭의 수치, 아래 탭, 날씨와 고비, 지도의 리본, 수첩의 숨은 것.

```
Save each image to the EXACT path. Lowercase names, PNG with transparent background, 256x256.
Style: Bold simplified UI icon in carved linocut style, black ink outline with a warm cream fill and one muted gold accent, readable at 18 pixels, centered, isolated on a fully transparent background (alpha), consistent stroke weight across the whole set, no text, no border.

Stats (7)
1. E:\Game_project\marugeum\public\art\ui-stat-hp.png — A simple heart with a small cross notch
2. E:\Game_project\marugeum\public\art\ui-stat-hunger.png — A rice bowl with chopsticks
3. E:\Game_project\marugeum\public\art\ui-stat-thirst.png — A water drop
4. E:\Game_project\marugeum\public\art\ui-stat-temp.png — A thermometer with a small snowflake
5. E:\Game_project\marugeum\public\art\ui-stat-fatigue.png — A crescent moon with a closed eye
6. E:\Game_project\marugeum\public\art\ui-stat-rad.png — A radiation trefoil inside a circle
7. E:\Game_project\marugeum\public\art\ui-stat-mind.png — A small flame of a candle

Tabs (4)
8. E:\Game_project\marugeum\public\art\ui-tab-go.png — A trail sign post with two arrows
9. E:\Game_project\marugeum\public\art\ui-tab-act.png — An open hand
10. E:\Game_project\marugeum\public\art\ui-tab-pack.png — A hiking backpack
11. E:\Game_project\marugeum\public\art\ui-tab-body.png — A simple human figure outline

Weather (5)
12. E:\Game_project\marugeum\public\art\ui-weather-clear.png — A sun over a mountain peak
13. E:\Game_project\marugeum\public\art\ui-weather-cloud.png — A cloud over a mountain peak
14. E:\Game_project\marugeum\public\art\ui-weather-rain.png — Slanted rain lines from a cloud, drops slightly yellow-gold
15. E:\Game_project\marugeum\public\art\ui-weather-fog.png — Horizontal fog bands over a peak
16. E:\Game_project\marugeum\public\art\ui-wind.png — Three curved wind lines with an arrow tip

Crisis (3)
17. E:\Game_project\marugeum\public\art\ui-crisis-cold.png — A large snowflake with ice spikes
18. E:\Game_project\marugeum\public\art\ui-crisis-fallout.png — A cloud dropping yellow-gold drops with a small radiation trefoil
19. E:\Game_project\marugeum\public\art\ui-crisis-snow.png — A mountain buried under a heavy snow cap with falling flakes

Map and journal (5)
20. E:\Game_project\marugeum\public\art\ui-ribbon-mine.png — A yellow-gold hiking ribbon tied in a knot on a short branch, two tails hanging
21. E:\Game_project\marugeum\public\art\ui-ribbon-ridge.png — A faded red hiking ribbon tied on a short branch, frayed tails
22. E:\Game_project\marugeum\public\art\ui-family.png — A small photograph of two figures (an adult and a child, faceless silhouettes) with a bent corner
23. E:\Game_project\marugeum\public\art\ui-star-hard.png — A carved five-point star in muted gold with a thin black outline
24. E:\Game_project\marugeum\public\art\ui-hidden.png — A small closed wooden box with a keyhole and a question-mark shaped crack of light (no letter, just a crack)
```

---

## D. UI 바탕과 글자 4장 ★★

```
Save each image to the EXACT path. Lowercase names, PNG.

1. E:\Game_project\marugeum\public\art\ui-logo.png (2048x768, transparent background) — The Korean game title "마루금" as bold hand-carved woodblock lettering in black ink with rough carved edges and a thin muted gold underline shaped like a mountain ridgeline. Exactly these three Hangul characters: 마 루 금. Centered, generous padding, fully transparent background (alpha). No other text.
2. E:\Game_project\marugeum\public\art\ui-paper.png (1024x1024, seamless tileable) — Seamless tileable texture of warm aged paper with faint fibers and very light ink speckles, low contrast, no objects, no text. Must tile without visible seams on all four edges.
3. E:\Game_project\marugeum\public\art\ui-journal.png (1600x1000) — An open worn field notebook seen from above, two cream pages with faint ruled lines, a pressed leaf and a small ribbon bookmark in the gutter, edges of the pages soft and dark, the pages themselves left nearly empty for text overlay. Monochrome linocut style with muted gold accent, no text.
4. E:\Game_project\marugeum\public\art\ui-map.png (2400x800, 3:1) — A very faint, low-contrast linocut panorama of the Baekdudaegan mountain range from south to north as a background layer: long overlapping ridgelines from left (Jirisan) to right (Seoraksan and the DMZ), dark navy-black ink on deep night blue, almost no detail, no labels, no text. It sits behind map nodes so it must stay quiet.
```

---

## E. 엔딩과 죽음, 숨은 장면 8장 (1600×900, 16:9) ★★

지금 죽으면 그림 없이 글만 뜬다. 죽음의 이유마다 한 장, 숨은 장면 두 장.

```
Generate each image below and save it to the EXACT path. Lowercase names, PNG, 1600x900.
Style for every image: Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, simplified shapes, one muted gold accent used sparingly, quiet post-apocalyptic Korean mountains, no text, no letters, no logo, no watermark. People only as silhouettes or seen from behind, no faces. Death is suggested, never shown directly. Wide 16:9 composition.

1. E:\Game_project\marugeum\public\art\ending-dead-rad.png — An empty backpack and a pair of boots left on a low ridge under a yellowish sky, a faded family photograph tucked under a stone beside them, rain beginning
2. E:\Game_project\marugeum\public\art\ending-dead-cold.png — A snow-covered ridge at dawn, a small mound of snow beside a burnt-out campfire ring, a blanket corner showing, the first gold light touching the peak
3. E:\Game_project\marugeum\public\art\ending-dead-hunger.png — An empty tin can and a spoon on a rock beside a trail, the trail continuing north into layered ridges, a walking stick lying across the path
4. E:\Game_project\marugeum\public\art\ending-dead-thirst.png — A dry stream bed of white stones in a valley, an empty canteen lying open, a thin line of a distant spring visible high on the slope, out of reach
5. E:\Game_project\marugeum\public\art\ending-dead-beast.png — Torn straps of a backpack in trampled grass on a mountain slope, paw prints and hoof prints in mud leading into dark pine trees
6. E:\Game_project\marugeum\public\art\ending-dead-gun.png — An abandoned military bunker doorway on a ridge, a backpack fallen in the doorway, a single spent shell casing glinting gold on the stones
7. E:\Game_project\marugeum\public\art\ending-people.png — Inside the Hyangnobong refugee camp at morning, a line of people from behind waiting at a tent: two hikers (one limping), a teenager, a family of three with a child holding a drawing, an old water carrier, all seen from behind, warm generator lights
8. E:\Game_project\marugeum\public\art\ending-afterword.png — Spring at the opened DMZ fence gate, a long line of people from behind walking through into a green untouched valley, at the very end of the line a man, a woman and a small child holding hands, looking back once over their shoulders toward the south
```

---

## F. 스토어 10장 ★ (출시 전, 번들에 안 들어간다)

스팀 규격(2026년 기준. 올리기 전에 Steamworks 안내에서 다시 확인), itch.io, 공유 카드. 스팀 캡슐에는 게임 이름이 들어가야 하니
**그림은 글자 없이** 만들고, 이름은 D-1 의 `ui-logo.png` 를 제가 얹어 마무리한다 (그림 생성기는 한글을 자주 틀린다).

```
Save each image to the EXACT path. Lowercase names, PNG, exact pixel size.
Style for every image: Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, one muted gold accent used sparingly, Korean mountain ridges after a catastrophe, a lone hiker seen from behind with a large backpack. No text, no letters, no logo, no watermark. Leave calm empty space where noted for the title to be added later.

1. E:\Game_project\marugeum\store\steam-capsule-small.png (462x174) — The hiker small at the right on a ridge line, layered peaks, empty sky on the left half for the title
2. E:\Game_project\marugeum\store\steam-capsule-main.png (1232x706) — The hiker on a jagged ridge in the lower right, the long Baekdudaegan range receding north, a small gold sunrise, empty upper left third for the title
3. E:\Game_project\marugeum\store\steam-capsule-vertical.png (748x896) — The hiker climbing a steep trail toward a far gold light at the summit, tall layered ridges, empty top quarter for the title
4. E:\Game_project\marugeum\store\steam-page-bg.png (1438x810) — Very quiet, low contrast wide panorama of misty ridges at dusk, almost abstract, no figure, used behind store text
5. E:\Game_project\marugeum\store\steam-library-capsule.png (600x900) — Vertical: a yellow hiking ribbon tied on a branch in the foreground, the hiker small on the ridge behind, empty top third for the title
6. E:\Game_project\marugeum\store\steam-library-hero.png (3840x1240) — Ultra wide panorama of the entire ridge from Jirisan to the DMZ fence, the hiker tiny in the center third, no important detail in the middle area where the logo will sit
7. E:\Game_project\marugeum\store\steam-library-logo.png (1280x720, transparent background) — The same "마루금" woodblock lettering as ui-logo, centered, fully transparent background
8. E:\Game_project\marugeum\store\steam-community-icon.png (184x184) — A simple carved emblem: a mountain ridge line with a small gold ribbon, square, readable at small size
9. E:\Game_project\marugeum\store\itch-cover.png (630x500) — The hiker at a fork in the ridge trail, a yellow ribbon on a branch pointing north, layered peaks, empty top area for the title
10. E:\Game_project\marugeum\store\share-card.png (1200x630) — Social link preview: the hiker small on the right, a family photograph pinned to a rock in the foreground left, empty middle-left for the title
```

---

## 넣은 뒤

1. 그림을 `public\art\` (스토어는 `store\`)에 넣고 푸시한다
2. 제가 webp로 바꾸고, A는 그대로 뜨는지 확인하고, B~E는 코드에 잇는다
3. 빠진 것 다시 세기: `node tools/art-missing.cjs`
