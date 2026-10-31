# 마루금 삽화 목록과 프롬프트

이미지 생성 도구(GPT 등)에 아래 프롬프트를 그대로 붙여 넣는다. 생성한 파일은 `public/art/` 에 정해진 이름으로 넣는다.
파일이 있으면 게임이 바로 쓰고, 없으면 코드가 그린 그림이나 글만 나온다.

## 공통 스타일 (모든 프롬프트 끝에 붙는다)

```
Monochrome linocut woodblock print, bold black ink on warm aged paper, high contrast, coarse carved texture, simplified shapes, one muted gold accent used sparingly, quiet post-apocalyptic Korean mountains, no text, no letters, no logo, no watermark
```

- 사람은 얼굴 묘사 없이 실루엣이나 뒷모습으로. 전쟁과 시체는 직접 묘사 대신 암시로
- 한 장 뽑아 마음에 들면 그 결과를 "참고 이미지"로 걸고 나머지를 뽑으면 톤이 맞는다
- 크기: 장면 1024×1024, 이벤트 1536×512(없으면 1792×1024 뽑아 가운데를 3:1로 자른다), 제목 1920×1080
- 형식: PNG. 이름은 아래 표의 파일 이름 그대로

## 1. 장면 그림 (필수 10장, 정사각형)

| 파일 | 자리 | 프롬프트 |
|---|---|---|
| scene-start.png | 중산리 야영장 | Abandoned mountain campground at dawn, a few empty tents, a small wooden ranger hut, a flagpole with no flag, pine trees, Jirisan ridge in the background, square composition |
| scene-peak.png | 봉우리 | Rocky summit of a Korean mountain, a stone cairn and a wooden trail signpost, vast ridgelines fading into distance, thin clouds below the summit, square composition |
| scene-pass.png | 고개 | A mountain pass road cutting between two slopes, a line of abandoned cars with open doors, a fallen barricade, mist, square composition |
| scene-temple.png | 산사 | A small Korean Buddhist temple with curved tiled roof, stone lantern, wooden pillars, forest behind, a single candle glow in the doorway, square composition |
| scene-shelter.png | 대피소 | A mountain hut shelter with a steep roof and a stovepipe chimney, pine trees, a lit window, square composition |
| scene-village.png | 폐마을 | An empty Korean mountain village, two or three traditional houses with tiled roofs, a persimmon tree with fruit, a stone wall, no people, square composition |
| scene-valley.png | 계곡 | A deep mountain valley with a rushing stream over boulders, dense trees, a broken suspension bridge in the distance, square composition |
| scene-spring.png | 약수터 | A mountain spring with a small stone basin, a pipe pouring water, a wooden ladle, mossy rocks, square composition |
| scene-military.png | 군 시설 | An abandoned military bunker on a ridge, radio antenna mast, barbed wire fence, a warning sign shape without letters, square composition |
| scene-goal.png | 향로봉 안전지대 | A row of military tents and a helipad on a mountain top at night, strings of electric lights, a helicopter silhouette on the ground, hope, square composition |

## 1-2. 장면 그림 16:9 (장면 중심 화면용, 10장)

파일 이름 `scene-<종류>-wide.png`, 1792×1024 또는 1920×1080. 각 프롬프트 끝에 공통 스타일 문구와 아래 한 줄을 붙인다.

```
wide 16:9 composition, key objects spread across the full width with clear empty ground in the lower third, nothing important in the far corners
```

| 파일 | 프롬프트 |
|---|---|
| scene-start-wide.png | Abandoned mountain campground at dawn seen from the entrance, several empty tents across the width, a small wooden ranger hut on the right, a bare flagpole, pine trees on the left, Jirisan ridge behind |
| scene-peak-wide.png | Rocky summit ridge of a Korean mountain, a stone cairn on the left, a wooden trail signpost on the right, a dark rock overhang in the middle distance, vast ridgelines fading away, thin clouds below |
| scene-pass-wide.png | A mountain pass road between two slopes, a line of abandoned cars with open doors stretching across, a fallen barricade, a roadside shrine stone on the left, mist |
| scene-temple-wide.png | A small Korean Buddhist temple with curved tiled roof on the right, a stone lantern and a well in the courtyard, a bell pavilion on the left, forest behind, a single candle glow in the doorway |
| scene-shelter-wide.png | A mountain hut shelter with a steep roof and stovepipe chimney in the center, a woodpile beside it, a water tank, pine trees, a lit window |
| scene-village-wide.png | An empty Korean mountain village street, traditional houses with tiled roofs on both sides, a stone well in the middle, a persimmon tree with fruit, a barn door ajar, no people |
| scene-valley-wide.png | A deep mountain valley with a wide rushing stream across the foreground, boulders, dense trees, a broken suspension bridge on the right, a dark cave mouth in the left cliff |
| scene-spring-wide.png | A mountain spring with a stone basin and a pipe pouring water in the center, mossy rocks, a wooden ladle, a small shrine with ribbons on the left, a shaded hollow under a boulder on the right |
| scene-military-wide.png | An abandoned military bunker on a ridge with a steel door, a radio antenna mast, barbed wire fence across the width, two camouflaged trucks on the right, a sandbag wall |
| scene-goal-wide.png | A row of military tents and a helipad on a mountain top at night, strings of electric lights across the width, a helicopter silhouette on the ground, a checkpoint gate in front, hope |

## 2. 제목 그림 (필수 1장, 16:9)

| 파일 | 프롬프트 |
|---|---|
| title.png | A lone hiker with a backpack walking north along a long mountain ridgeline, the Baekdudaegan range stretching to the horizon, a dead yellow sea far to the east, dark rain clouds, the ridge path marked with a single muted gold line, cinematic wide 16:9 composition, lots of empty sky at the top for a title |

## 3. 이벤트 삽화 (가로 띠 3:1)

우선순위: ★ 먼저, ☆ 나중에, – 안 해도 됨(장면 그림으로 충분).

### 산사
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-temple_monk.png | 남은 사람 | An old Buddhist monk sitting alone in a dim temple hall with a single candle, seen from the doorway, wide banner composition |
| ☆ | event-temple_bell.png | 범종 | A large bronze temple bell under a wooden pavilion, a striking log hanging beside it, mountain mist, wide banner composition |

### 대피소
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ☆ | event-shelter_journal.png | 산장지기의 일지 | An open handwritten journal on a wooden desk by a window, a mug, shaky handwriting suggested by scratches, wide banner composition |
| ★ | event-shelter_survivor.png | 먼저 온 사람 | A man in a jacket sitting with his back to the viewer in front of a small iron stove in a mountain hut, warm glow, wide banner composition |
| ☆ | event-shelter_body.png | 침상 위 | A bunk bed in a dark hut, a blanket covering a shape on the upper bunk, a backpack at the head, wide banner composition |

### 폐마을
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-village_family.png | 피난민 가족 | A family of three huddled in a barn doorway, the father shielding a child, seen from a distance, wide banner composition |
| ☆ | event-village_radio.png | 라디오 | An old battery radio on the floor of an empty Korean room, a faint glow from its dial, wide banner composition |
| ☆ | event-village_well.png | 우물 | A stone village well with its wooden lid half open, a rope and bucket, something unseen inside, ominous, wide banner composition |
| ☆ | event-village_graves.png | 뒷산의 무덤 | Six fresh grave mounds on a hillside with wooden markers, a village below, wide banner composition |

### 군 시설
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-military_deserter.png | 총 | The muzzle of a rifle pointing out from a half open steel door, a soldier's silhouette behind it, wide banner composition |
| ☆ | event-military_medkit.png | 구급상자 | A dented military first aid box hanging on a concrete bunker wall, pill bottles spilled, wide banner composition |
| ☆ | event-military_mines.png | 지뢰 표지판 | A barbed wire fence with a triangular warning sign shape without letters, a supply warehouse beyond it, wide banner composition |

### 계곡
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-valley_boar.png | 멧돼지 | A huge wild boar emerging from bushes beside a mountain stream, steam from its snout, wide banner composition |
| ☆ | event-valley_bodies.png | 떠내려온 것 | Life jackets and bags caught between boulders in a stream, nothing else shown, wide banner composition |
| ☆ | event-valley_bridge.png | 끊어진 다리 | A rope suspension bridge broken in the middle over a fast river, stepping stones below, wide banner composition |

### 약수터
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| – | event-spring_note.png | 쪽지 | A folded note wrapped in plastic pressed under a stone beside a mountain spring, wide banner composition |
| ☆ | event-spring_snake.png | 뱀 | A coiled viper sunning on a flat rock beside a spring, wide banner composition |

### 봉우리
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-peak_view.png | 동쪽 | View from a summit toward a distant sea, a dark band on the water, several thin columns of smoke rising along the coast, wide banner composition |
| ★ | event-peak_heli.png | 헬리콥터 | A military helicopter flying low along a ridge, its open side door, seen from a summit, wide banner composition |
| ☆ | event-peak_lights.png | 북쪽의 불빛 | Night ridgeline, a distant row of steady electric lights beyond the next mountain, stars, wide banner composition |

### 고개
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ☆ | event-pass_checkpoint.png | 검문소 | A wrecked roadside checkpoint, a lowered barrier, a long line of abandoned cars on a mountain road, wide banner composition |
| ☆ | event-pass_fallen.png | 쓰러진 사람 | A person lying at the top of a mountain pass road, seen from behind the viewer's boots, wide banner composition |

### 비와 밤
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-rain_fallout.png | 검은 비 | Heavy slanting rain on a bare ridge, grey streaks on the rocks, a hiker crouched under an overhang, wide banner composition |
| ★ | event-night_dogs.png | 들개 | Several pairs of eyes glowing in the dark around a dying campfire, dog silhouettes, wide banner composition |
| ☆ | event-night_storm.png | 비바람 | A storm at night on an exposed ridge, rain blown sideways, a small figure pressed against a boulder, wide banner composition |
| ☆ | event-night_gunfire.png | 총성 | A dark forest at night, a single muzzle flash far between the trees, wide banner composition |
| – | event-night_dream.png | 꿈 | A calm beach with gentle waves and distant figures, dreamlike, softer carving, wide banner composition |

### 지역 고유
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-deogyu_gondola.png | 멈춘 곤돌라 | Ski resort gondola cabins hanging motionless on a cable over a mountain slope, a broken station below, wide banner composition |
| ☆ | event-minjuji_samdobong.png | 삼도봉 | A stone monument on a summit with dozens of paper notes weighed down by pebbles at its base, wide banner composition |
| ☆ | event-hwangak_jikji.png | 직지사 | The inside of a large temple hall with hundreds of paper slips pinned to the wall, wide banner composition |
| ★ | event-songni_buddha.png | 미륵대불 | A giant standing bronze Buddha statue under a cloudy sky, abandoned tarp tents and a cold campfire at its feet, wide banner composition |
| ☆ | event-sobaek_tunnel.png | 죽령 터널 | A highway tunnel mouth with cars jammed inside fading into darkness, a fallen barricade, wide banner composition |
| ★ | event-taebaek_mine.png | 폐광 | A mine entrance in a hillside with faint lamplight deep inside and small figures at the mouth, wide banner composition |
| ☆ | event-hambaek_manhangjae.png | 만항재 | Five military trucks parked across the highest paved mountain pass, canvas flapping, no soldiers, wide banner composition |
| ★ | event-duta_smoke.png | 무릉계곡의 연기 | Looking down from a ridge at a small village in a valley with three thin lines of cooking smoke, the sea beyond, wide banner composition |
| ★ | event-odae_forest.png | 전나무 숲 | A straight path through a forest of ancient tall fir trees, light shafts, peaceful, wide banner composition |
| ★ | event-seorak_checkpoint.png | 살아 있는 검문소 | Two soldiers in gas masks holding a radiation counter at a mountain road checkpoint, a generator and lights, wide banner composition |

### 다시 만나는 사람과 라디오
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ☆ | event-survivor_return.png | 정우 | A man turning around from a campfire inside a hut to greet the viewer, hand half raised, wide banner composition |
| ☆ | event-survivor_revenge.png | 기억해 둔 얼굴 | A hand gripping a backpack strap in the dark, a shadowed figure crouching over a sleeping camp, wide banner composition |
| – | event-radio_news_camp.png | 라디오 소식 | A radio on a camp table beside a humming generator at night, wide banner composition |
| – | event-radio_news_drop.png | 보급 투하 예고 | A red parachute drifting down over a ridge at dusk, gold accent on the parachute, wide banner composition |
| ★ | event-supply_drop.png | 붉은 낙하산 | A dented supply crate with a red parachute caught between rocks on a summit, gold accent on the parachute, wide banner composition |

### 연료와 차량
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| – | event-pass_siphon.png | 멈춘 차들 | A hose running from a car's fuel filler into a jerrycan on a mountain road, wide banner composition |
| – | event-military_siphon.png | 군용 트럭 | Two camouflaged army trucks under netting, a fuel drum in the back, wide banner composition |
| ☆ | event-village_tractor.png | 경운기 | A Korean two-wheel tractor parked at a village edge with cabbages and a fuel can in its cart, a field beyond, wide banner composition |

### 시작과 안내
| 우선 | 파일 | 장면 | 프롬프트 |
|---|---|---|---|
| ★ | event-intro_morning.png | 엿새째 아침 | Dawn at an abandoned campground, one tent, a portable generator, a camping fridge and two fuel cans beside it, a backpack, wide banner composition |
| – | event-tut_scout.png | 첫 조사 | (장면 그림으로 충분) |
| – | event-tut_water.png | 물 | (장면 그림으로 충분) |
| – | event-tut_rain.png | 비 | (장면 그림으로 충분) |
| – | event-tut_night.png | 첫 밤 | (장면 그림으로 충분) |
| – | event-tut_depart.png | 떠날 때 | (장면 그림으로 충분) |

## 4. 스토어용 (출시 때)

| 용도 | 크기 | 프롬프트 |
|---|---|---|
| Steam 헤더 캡슐 | 920×430 | The title illustration cropped to the hiker and the ridge, strong silhouette, space on the left for a title, wide composition |
| Steam 세로 캡슐 | 600×900 | A lone hiker from behind looking up a long ridge toward a far gold light, tall vertical composition |
| 앱 아이콘 | 1024×1024 | A single mountain ridge line with a gold dot at the summit, extremely simple, flat, square, readable at small size |

## 넣는 법

파일을 `E:\Game_project\marugeum\public\art\` 에 넣은 뒤:

```powershell
Set-Location "E:\Game_project\marugeum"; git add public/art; git commit -m "삽화 추가"; git push
```

브라우저를 새로고침하면 바로 보인다. 장면 그림은 로그 왼쪽, 이벤트 삽화는 이벤트 창 위, 제목 그림은 제목 화면 배경이다.
