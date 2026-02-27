export type Locale = "auto" | "ko" | "en" | "ja" | "zh-TW";

type TranslationMap = Record<string, string>;

const ko: TranslationMap = {
  // Profile page
  "profile": "프로필",
  "settings": "설정",
  "back": "뒤로",
  "level": "레벨",
  "gold": "골드",
  "gems": "젬",
  "stardust": "별가루",
  "posts": "게시글",
  "comments": "댓글",
  "tap_to_edit": "탭하여 변경",
  "nickname_updated": "닉네임이 변경되었습니다",
  "nickname_failed": "닉네임 변경 실패",

  // Settings menu
  "language": "언어 변경",
  "contact": "문의하기",
  "terms": "이용약관",
  "privacy": "개인정보처리방침",
  "logout": "로그아웃",
  "logout_confirm": "정말 로그아웃 하시겠습니까?",
  "cancel": "취소",
  "confirm": "확인",

  // Language options
  "lang_auto": "자동 (기기 설정)",
  "lang_ko": "한국어",
  "lang_en": "English",
  "lang_ja": "日本語",
  "lang_zh": "繁體中文",
  "select_language": "언어 선택",

  // Contact
  "contact_title": "문의하기",
  "contact_category": "문의 유형",
  "contact_category_bug": "버그 신고",
  "contact_category_suggestion": "건의사항",
  "contact_category_account": "계정 문제",
  "contact_category_other": "기타",
  "contact_email": "이메일 (선택)",
  "contact_content": "문의 내용",
  "contact_submit": "제출하기",
  "contact_success": "문의가 접수되었습니다",
  "contact_placeholder": "문의 내용을 입력해주세요...",

  // Terms
  "terms_title": "이용약관",
  "terms_content": `슬라임토피아 이용약관

제1조 (목적)
본 약관은 슬라임토피아(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 슬라임토피아가 제공하는 모든 게임 서비스를 의미합니다.
2. "회원"이란 본 약관에 동의하고 서비스를 이용하는 자를 의미합니다.
3. "콘텐츠"란 서비스 내에서 제공되는 모든 데이터를 의미합니다.

제3조 (약관의 효력)
본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.

제4조 (서비스의 제공)
1. 서비스는 연중무휴, 24시간 제공함을 원칙으로 합니다.
2. 서비스 점검 등의 사유로 서비스가 일시 중단될 수 있습니다.

제5조 (회원의 의무)
1. 회원은 관계법령, 본 약관의 규정을 준수하여야 합니다.
2. 회원은 타인의 권리를 침해하는 행위를 하여서는 안 됩니다.
3. 부정한 방법으로 서비스를 이용하여서는 안 됩니다.`,

  // Privacy
  "privacy_title": "개인정보처리방침",
  "privacy_content": `슬라임토피아 개인정보처리방침

1. 수집하는 개인정보
- 소셜 로그인 시: 소셜 계정 고유 식별자, 닉네임
- 게스트 로그인 시: 기기 식별 정보
- 서비스 이용 시: 게임 플레이 데이터, 접속 기록

2. 개인정보의 이용 목적
- 서비스 제공 및 운영
- 회원 관리 및 본인 확인
- 서비스 개선 및 분석

3. 개인정보의 보유 기간
- 회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.
- 관계법령에 의해 보존해야 하는 정보는 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
- 원칙적으로 개인정보를 제3자에게 제공하지 않습니다.

5. 이용자의 권리
- 언제든지 개인정보의 열람, 수정, 삭제를 요청할 수 있습니다.
- 문의: support@slimetopia.com`,

  // Profile backgrounds
  "change_background": "배경 변경",

  // Bottom nav
  "home": "홈",
  "inventory": "인벤토리",
  "codex": "도감",
  "merge": "합성",
  "explore": "탐험",
  "shop": "상점",

  // Login page
  "login_tagline": "나만의 슬라임 왕국을 만들어보세요!",
  "login_guest_start": "게스트로 바로 시작",
  "login_guest_hint": "기기에 저장되며, 나중에 이메일로 연동할 수 있어요",
  "login_email_section": "이메일 계정",
  "login_email_btn": "이메일로 로그인",
  "login_register_btn": "새 계정 만들기",
  "login_social_section": "소셜 로그인",
  "login_email_title": "이메일 로그인",
  "login_register_title": "새 계정 만들기",
  "login_email_placeholder": "이메일 주소",
  "login_password_placeholder": "비밀번호",
  "login_password_confirm_placeholder": "비밀번호 확인",
  "login_password_hint": "비밀번호 (4자 이상)",
  "login_nickname_auto": "닉네임은 자동 생성됩니다 (나중에 변경 가능)",
  "login_btn": "로그인",
  "login_register_submit": "가입하기",
  "login_go_back": "돌아가기",
  "login_no_account": "계정이 없으신가요?",
  "login_has_account": "이미 계정이 있어요",
  "login_connecting": "접속 중...",
  "login_logging_in": "로그인 중...",
  "login_registering": "가입 중...",
  "login_error_guest_fail": "게스트 로그인에 실패했습니다.",
  "login_error_server": "서버와 연결할 수 없습니다.",
  "login_error_password_length": "비밀번호는 4자 이상이어야 합니다.",
  "login_error_password_mismatch": "비밀번호가 일치하지 않습니다.",
  "login_error_email_taken": "이미 사용 중인 이메일입니다.",
  "login_error_register_fail": "회원가입에 실패했습니다.",
  "login_error_invalid_credentials": "이메일 또는 비밀번호가 틀립니다.",
  "login_error_login_fail": "로그인에 실패했습니다.",

  // Splash screen
  "splash_loading": "로딩 중...",
  "splash_tip_collect": "200종의 슬라임을 수집해보세요!",
  "splash_tip_merge": "두 슬라임을 합성하면 새로운 슬라임이!",
  "splash_tip_explore": "탐험을 보내 희귀 재료를 얻으세요",
  "splash_tip_evolve": "진화 트리로 슬라임을 강화하세요",
  "splash_tip_collection": "도감을 완성하면 보너스 보상이!",

  // Common game UI
  "loading": "로딩 중...",
  "error": "오류",
  "ok": "확인",
  "save": "저장",
  "delete": "삭제",
  "close": "닫기",
  "search": "검색",
  "empty": "비어있음",
  "slime": "슬라임",
  "slimes": "슬라임",
  "species": "종족",
  "element": "속성",
  "grade": "등급",
  "personality": "성격",
  "exp": "경험치",
  "collection": "컬렉션",
  "achievements": "업적",
  "leaderboard": "리더보드",
  "missions": "미션",
  "attendance": "출석",
  "gacha": "뽑기",
  "discovery": "발견",
  "materials": "소재",
  "accessories": "악세서리",
  "evolution": "진화",
  "season": "시즌",
  "mail": "우편",
  "wheel": "룰렛",
  "community": "커뮤니티",
  "mini_contents": "미니게임",
  "shorts": "쇼츠",

  // Elements
  "element_water": "물",
  "element_fire": "불",
  "element_grass": "풀",
  "element_light": "빛",
  "element_dark": "어둠",
  "element_ice": "얼음",
  "element_electric": "전기",
  "element_poison": "독",
  "element_earth": "땅",
  "element_wind": "바람",
  "element_celestial": "천상",

  // Grades
  "grade_common": "일반",
  "grade_uncommon": "고급",
  "grade_rare": "희귀",
  "grade_epic": "영웅",
  "grade_legendary": "전설",
  "grade_mythic": "신화",

  // Personalities
  "personality_energetic": "활발한",
  "personality_chill": "느긋한",
  "personality_foodie": "먹보",
  "personality_curious": "호기심 많은",
  "personality_tsundere": "츤데레",
  "personality_gentle": "온순한",

  // Home page buttons
  "home_attendance": "출석",
  "home_mission": "미션",
  "home_mailbox": "우편",
  "home_background": "배경",
  "home_codex": "도감",
  "home_achievements": "업적",
  "home_leaderboard": "랭킹",
  "home_inventory": "인벤토리",
  "home_gacha": "뽑기",
  "home_shop": "상점",
  "home_bg_title": "배경 변경",
  "home_bg_subtitle": "배경을 선택하세요",
  "home_bg_close": "닫기",
  "home_bg_in_use": "사용 중",
  "home_bg_owned": "보유",

  // Home backgrounds
  "bg_default": "기본",
  "bg_sunset_meadow": "노을 초원",
  "bg_deep_ocean": "심해",
  "bg_cherry_blossom": "벚꽃 정원",
  "bg_aurora": "오로라",
  "bg_lava_cave": "용암 동굴",
  "bg_crystal_cave": "수정 동굴",
  "bg_bamboo_grove": "대나무 숲",
  "bg_desert_mirage": "사막 신기루",
  "bg_frozen_tundra": "빙하 설원",
  "bg_twilight_garden": "황혼의 정원",
  "bg_thunderstorm": "폭풍우",
  "bg_starlight": "별빛 하늘",
  "bg_cosmic_nebula": "우주 성운",
  "bg_rainbow_field": "무지개 들판",
  "bg_enchanted_forest": "요정의 숲",
  "bg_sakura_night": "밤벚꽃",
  "bg_underwater_temple": "해저 신전",
  "bg_blood_moon": "붉은 달",
  "bg_void_realm": "혼돈의 영역",
  "bg_golden_palace": "황금 궁전",
  "bg_emerald_valley": "에메랄드 계곡",
  "bg_celestial_throne": "천상의 옥좌",
  "bg_atlantis": "아틀란티스",
  "bg_dragon_realm": "용의 영역",
  "home_bg_count_suffix": "종",

  // Bottom nav extra
  "nav_mini_games": "미니게임",
  "nav_collection": "수집",
  "nav_profile": "프로필",
  "nav_slimes": "슬라임",
  "nav_more": "더보기",
  "more_title": "더보기",
  "more_section_content": "콘텐츠",
  "more_section_social": "소셜",
  "more_section_account": "계정",
  "more_gacha": "가챠",
  "more_shop": "상점",
  "more_discovery": "탐험",
  "more_mini": "미니게임",
  "more_community": "커뮤니티",
  "more_leaderboard": "리더보드",
  "more_achievements": "업적",
  "more_codex": "도감",
  "more_profile": "프로필",
  "more_mailbox": "우편함",
  "more_settings": "설정",

  // Promo banner
  "promo_ten_pull_title": "10연차 소환 OPEN!",
  "promo_ten_pull_subtitle": "10개를 한번에! 10% 할인 적용",
  "promo_ten_pull_btn": "상점",
  "promo_wheel_title": "매일 무료 룰렛!",
  "promo_wheel_subtitle": "오늘의 행운을 시험해 보세요",
  "promo_wheel_btn": "스핀",
  "promo_race_title": "슬라임 레이스!",
  "promo_race_subtitle": "점수를 올려 리더보드에 도전",
  "promo_race_btn": "출발",
  "promo_booster_title": "부스터로 성장 가속!",
  "promo_booster_subtitle": "EXP 2배 / 골드 2배 / 행운 UP",
  "promo_booster_btn": "구매",

  // TopBar
  "booster_gold": "골드",
  "booster_luck": "행운",
  "booster_default": "부스트",
};

const en: TranslationMap = {
  "profile": "Profile",
  "settings": "Settings",
  "back": "Back",
  "level": "Level",
  "gold": "Gold",
  "gems": "Gems",
  "stardust": "Stardust",
  "posts": "Posts",
  "comments": "Comments",
  "tap_to_edit": "Tap to edit",
  "nickname_updated": "Nickname updated",
  "nickname_failed": "Failed to update nickname",

  "language": "Language",
  "contact": "Contact Us",
  "terms": "Terms of Service",
  "privacy": "Privacy Policy",
  "logout": "Log Out",
  "logout_confirm": "Are you sure you want to log out?",
  "cancel": "Cancel",
  "confirm": "Confirm",

  "lang_auto": "Auto (Device)",
  "lang_ko": "한국어",
  "lang_en": "English",
  "lang_ja": "日本語",
  "lang_zh": "繁體中文",
  "select_language": "Select Language",

  "contact_title": "Contact Us",
  "contact_category": "Category",
  "contact_category_bug": "Bug Report",
  "contact_category_suggestion": "Suggestion",
  "contact_category_account": "Account Issue",
  "contact_category_other": "Other",
  "contact_email": "Email (optional)",
  "contact_content": "Message",
  "contact_submit": "Submit",
  "contact_success": "Your inquiry has been submitted",
  "contact_placeholder": "Describe your issue...",

  "terms_title": "Terms of Service",
  "terms_content": `SlimeTopia Terms of Service

Article 1 (Purpose)
These terms define the conditions and procedures for using SlimeTopia (the "Service").

Article 2 (Definitions)
1. "Service" refers to all game services provided by SlimeTopia.
2. "Member" refers to a person who agrees to these terms and uses the Service.
3. "Content" refers to all data provided within the Service.

Article 3 (Effectiveness)
These terms become effective when posted on the Service or otherwise notified to members.

Article 4 (Service Provision)
1. The Service is provided 24 hours a day, 365 days a year in principle.
2. The Service may be temporarily suspended due to maintenance.

Article 5 (Member Obligations)
1. Members must comply with relevant laws and these terms.
2. Members must not infringe on the rights of others.
3. Members must not use the Service through fraudulent means.`,

  "privacy_title": "Privacy Policy",
  "privacy_content": `SlimeTopia Privacy Policy

1. Information We Collect
- Social login: Social account unique identifier, nickname
- Guest login: Device identification information
- During use: Game play data, access records

2. Purpose of Use
- Service provision and operation
- Member management and identity verification
- Service improvement and analysis

3. Retention Period
- Information is retained until account deletion and destroyed immediately after.
- Information required by law is stored for the specified period.

4. Third-Party Disclosure
- We do not provide personal information to third parties in principle.

5. User Rights
- You may request access, modification, or deletion of your information at any time.
- Contact: support@slimetopia.com`,

  "change_background": "Change Background",

  "home": "Home",
  "inventory": "Inventory",
  "codex": "Codex",
  "merge": "Merge",
  "explore": "Explore",
  "shop": "Shop",

  // Login page
  "login_tagline": "Build your own Slime Kingdom!",
  "login_guest_start": "Quick Start as Guest",
  "login_guest_hint": "Saved on device. You can link an email later.",
  "login_email_section": "Email Account",
  "login_email_btn": "Log in with Email",
  "login_register_btn": "Create New Account",
  "login_social_section": "Social Login",
  "login_email_title": "Email Login",
  "login_register_title": "Create Account",
  "login_email_placeholder": "Email address",
  "login_password_placeholder": "Password",
  "login_password_confirm_placeholder": "Confirm password",
  "login_password_hint": "Password (4+ characters)",
  "login_nickname_auto": "A nickname will be generated automatically (changeable later)",
  "login_btn": "Log In",
  "login_register_submit": "Sign Up",
  "login_go_back": "Go back",
  "login_no_account": "Don't have an account?",
  "login_has_account": "Already have an account",
  "login_connecting": "Connecting...",
  "login_logging_in": "Logging in...",
  "login_registering": "Signing up...",
  "login_error_guest_fail": "Guest login failed.",
  "login_error_server": "Cannot connect to server.",
  "login_error_password_length": "Password must be at least 4 characters.",
  "login_error_password_mismatch": "Passwords do not match.",
  "login_error_email_taken": "This email is already in use.",
  "login_error_register_fail": "Registration failed.",
  "login_error_invalid_credentials": "Invalid email or password.",
  "login_error_login_fail": "Login failed.",

  // Splash screen
  "splash_loading": "Loading...",
  "splash_tip_collect": "Collect over 200 species of slimes!",
  "splash_tip_merge": "Merge two slimes to discover new ones!",
  "splash_tip_explore": "Send slimes on expeditions for rare materials",
  "splash_tip_evolve": "Power up slimes with the Evolution Tree",
  "splash_tip_collection": "Complete your Codex for bonus rewards!",

  // Common game UI
  "loading": "Loading...",
  "error": "Error",
  "ok": "OK",
  "save": "Save",
  "delete": "Delete",
  "close": "Close",
  "search": "Search",
  "empty": "Empty",
  "slime": "Slime",
  "slimes": "Slimes",
  "species": "Species",
  "element": "Element",
  "grade": "Grade",
  "personality": "Personality",
  "exp": "EXP",
  "collection": "Collection",
  "achievements": "Achievements",
  "leaderboard": "Leaderboard",
  "missions": "Missions",
  "attendance": "Attendance",
  "gacha": "Gacha",
  "discovery": "Discovery",
  "materials": "Materials",
  "accessories": "Accessories",
  "evolution": "Evolution",
  "season": "Season",
  "mail": "Mail",
  "wheel": "Wheel",
  "community": "Community",
  "mini_contents": "Mini Games",
  "shorts": "Shorts",

  // Elements
  "element_water": "Water",
  "element_fire": "Fire",
  "element_grass": "Grass",
  "element_light": "Light",
  "element_dark": "Dark",
  "element_ice": "Ice",
  "element_electric": "Electric",
  "element_poison": "Poison",
  "element_earth": "Earth",
  "element_wind": "Wind",
  "element_celestial": "Celestial",

  // Grades
  "grade_common": "Common",
  "grade_uncommon": "Uncommon",
  "grade_rare": "Rare",
  "grade_epic": "Epic",
  "grade_legendary": "Legendary",
  "grade_mythic": "Mythic",

  // Personalities
  "personality_energetic": "Energetic",
  "personality_chill": "Chill",
  "personality_foodie": "Foodie",
  "personality_curious": "Curious",
  "personality_tsundere": "Tsundere",
  "personality_gentle": "Gentle",

  // Home page buttons
  "home_attendance": "Check-In",
  "home_mission": "Missions",
  "home_mailbox": "Mailbox",
  "home_background": "Theme",
  "home_codex": "Codex",
  "home_achievements": "Awards",
  "home_leaderboard": "Rank",
  "home_inventory": "Inventory",
  "home_gacha": "Gacha",
  "home_shop": "Shop",
  "home_bg_title": "Change Background",
  "home_bg_subtitle": "Select a background",
  "home_bg_close": "Close",
  "home_bg_in_use": "Active",
  "home_bg_owned": "Owned",

  // Home backgrounds
  "bg_default": "Default",
  "bg_sunset_meadow": "Sunset Meadow",
  "bg_deep_ocean": "Deep Ocean",
  "bg_cherry_blossom": "Cherry Blossom",
  "bg_aurora": "Aurora",
  "bg_lava_cave": "Lava Cave",
  "bg_crystal_cave": "Crystal Cave",
  "bg_bamboo_grove": "Bamboo Grove",
  "bg_desert_mirage": "Desert Mirage",
  "bg_frozen_tundra": "Frozen Tundra",
  "bg_twilight_garden": "Twilight Garden",
  "bg_thunderstorm": "Thunderstorm",
  "bg_starlight": "Starlight Sky",
  "bg_cosmic_nebula": "Cosmic Nebula",
  "bg_rainbow_field": "Rainbow Field",
  "bg_enchanted_forest": "Enchanted Forest",
  "bg_sakura_night": "Sakura Night",
  "bg_underwater_temple": "Sunken Temple",
  "bg_blood_moon": "Blood Moon",
  "bg_void_realm": "Void Realm",
  "bg_golden_palace": "Golden Palace",
  "bg_emerald_valley": "Emerald Valley",
  "bg_celestial_throne": "Celestial Throne",
  "bg_atlantis": "Atlantis",
  "bg_dragon_realm": "Dragon Realm",
  "home_bg_count_suffix": " themes",

  // Bottom nav extra
  "nav_mini_games": "Mini Games",
  "nav_collection": "Collect",
  "nav_profile": "Profile",
  "nav_slimes": "Slimes",
  "nav_more": "More",
  "more_title": "More",
  "more_section_content": "Content",
  "more_section_social": "Social",
  "more_section_account": "Account",
  "more_gacha": "Gacha",
  "more_shop": "Shop",
  "more_discovery": "Explore",
  "more_mini": "Mini Games",
  "more_community": "Community",
  "more_leaderboard": "Leaderboard",
  "more_achievements": "Achievements",
  "more_codex": "Codex",
  "more_profile": "Profile",
  "more_mailbox": "Mailbox",
  "more_settings": "Settings",

  // Promo banner
  "promo_ten_pull_title": "10-Pull Summon OPEN!",
  "promo_ten_pull_subtitle": "10 at once! 10% discount applied",
  "promo_ten_pull_btn": "Shop",
  "promo_wheel_title": "Free Daily Roulette!",
  "promo_wheel_subtitle": "Try your luck today",
  "promo_wheel_btn": "Spin",
  "promo_race_title": "Slime Race!",
  "promo_race_subtitle": "Score high and climb the leaderboard",
  "promo_race_btn": "Go!",
  "promo_booster_title": "Boost Your Growth!",
  "promo_booster_subtitle": "2x EXP / 2x Gold / Luck UP",
  "promo_booster_btn": "Buy",

  // TopBar
  "booster_gold": "Gold",
  "booster_luck": "Luck",
  "booster_default": "Boost",
};

const ja: TranslationMap = {
  "profile": "プロフィール",
  "settings": "設定",
  "back": "戻る",
  "level": "レベル",
  "gold": "ゴールド",
  "gems": "ジェム",
  "stardust": "スターダスト",
  "posts": "投稿",
  "comments": "コメント",
  "tap_to_edit": "タップして変更",
  "nickname_updated": "ニックネームが変更されました",
  "nickname_failed": "ニックネームの変更に失敗しました",

  "language": "言語変更",
  "contact": "お問い合わせ",
  "terms": "利用規約",
  "privacy": "プライバシーポリシー",
  "logout": "ログアウト",
  "logout_confirm": "本当にログアウトしますか？",
  "cancel": "キャンセル",
  "confirm": "確認",

  "lang_auto": "自動（デバイス設定）",
  "lang_ko": "한국어",
  "lang_en": "English",
  "lang_ja": "日本語",
  "lang_zh": "繁體中文",
  "select_language": "言語を選択",

  "contact_title": "お問い合わせ",
  "contact_category": "カテゴリー",
  "contact_category_bug": "バグ報告",
  "contact_category_suggestion": "ご要望",
  "contact_category_account": "アカウント問題",
  "contact_category_other": "その他",
  "contact_email": "メール（任意）",
  "contact_content": "内容",
  "contact_submit": "送信",
  "contact_success": "お問い合わせが送信されました",
  "contact_placeholder": "お問い合わせ内容を入力してください...",

  "terms_title": "利用規約",
  "terms_content": `スライムトピア利用規約

第1条（目的）
本規約はスライムトピア（以下「サービス」）の利用条件および手続きに関する事項を規定することを目的とします。

第2条（定義）
1.「サービス」とは、スライムトピアが提供するすべてのゲームサービスを意味します。
2.「会員」とは、本規約に同意しサービスを利用する者を意味します。
3.「コンテンツ」とは、サービス内で提供されるすべてのデータを意味します。

第3条（規約の効力）
本規約はサービス画面に掲示またはその他の方法で会員に通知することにより効力が発生します。

第4条（サービスの提供）
1. サービスは年中無休、24時間提供することを原則とします。
2. メンテナンス等の理由によりサービスが一時中断される場合があります。

第5条（会員の義務）
1. 会員は関係法令、本規約の規定を遵守しなければなりません。
2. 会員は他人の権利を侵害する行為をしてはなりません。
3. 不正な方法でサービスを利用してはなりません。`,

  "privacy_title": "プライバシーポリシー",
  "privacy_content": `スライムトピア プライバシーポリシー

1. 収集する個人情報
- ソーシャルログイン時：ソーシャルアカウント固有識別子、ニックネーム
- ゲストログイン時：デバイス識別情報
- サービス利用時：ゲームプレイデータ、アクセス記録

2. 個人情報の利用目的
- サービスの提供および運営
- 会員管理および本人確認
- サービスの改善および分析

3. 個人情報の保有期間
- 退会時まで保有し、退会後直ちに破棄します。
- 関係法令により保存が必要な情報は該当期間中保管します。

4. 個人情報の第三者提供
- 原則として個人情報を第三者に提供しません。

5. 利用者の権利
- いつでも個人情報の閲覧、修正、削除を要求できます。
- お問い合わせ：support@slimetopia.com`,

  "change_background": "背景を変更",

  "home": "ホーム",
  "inventory": "持ち物",
  "codex": "図鑑",
  "merge": "合成",
  "explore": "探検",
  "shop": "ショップ",

  // Login page
  "login_tagline": "自分だけのスライム王国を作ろう！",
  "login_guest_start": "ゲストで今すぐ開始",
  "login_guest_hint": "デバイスに保存されます。後でメールと連携可能です。",
  "login_email_section": "メールアカウント",
  "login_email_btn": "メールでログイン",
  "login_register_btn": "新規アカウント作成",
  "login_social_section": "ソーシャルログイン",
  "login_email_title": "メールログイン",
  "login_register_title": "新規アカウント作成",
  "login_email_placeholder": "メールアドレス",
  "login_password_placeholder": "パスワード",
  "login_password_confirm_placeholder": "パスワード確認",
  "login_password_hint": "パスワード（4文字以上）",
  "login_nickname_auto": "ニックネームは自動生成されます（後で変更可能）",
  "login_btn": "ログイン",
  "login_register_submit": "登録する",
  "login_go_back": "戻る",
  "login_no_account": "アカウントをお持ちでない方",
  "login_has_account": "既にアカウントをお持ちの方",
  "login_connecting": "接続中...",
  "login_logging_in": "ログイン中...",
  "login_registering": "登録中...",
  "login_error_guest_fail": "ゲストログインに失敗しました。",
  "login_error_server": "サーバーに接続できません。",
  "login_error_password_length": "パスワードは4文字以上必要です。",
  "login_error_password_mismatch": "パスワードが一致しません。",
  "login_error_email_taken": "既に使用されているメールアドレスです。",
  "login_error_register_fail": "登録に失敗しました。",
  "login_error_invalid_credentials": "メールまたはパスワードが正しくありません。",
  "login_error_login_fail": "ログインに失敗しました。",

  // Splash screen
  "splash_loading": "読み込み中...",
  "splash_tip_collect": "200種以上のスライムを集めよう！",
  "splash_tip_merge": "2体のスライムを合成して新種を発見！",
  "splash_tip_explore": "探検でレア素材を手に入れよう",
  "splash_tip_evolve": "進化ツリーでスライムを強化しよう",
  "splash_tip_collection": "図鑑を完成させてボーナス報酬をゲット！",

  // Common game UI
  "loading": "読み込み中...",
  "error": "エラー",
  "ok": "OK",
  "save": "保存",
  "delete": "削除",
  "close": "閉じる",
  "search": "検索",
  "empty": "空です",
  "slime": "スライム",
  "slimes": "スライム",
  "species": "種族",
  "element": "属性",
  "grade": "レアリティ",
  "personality": "性格",
  "exp": "経験値",
  "collection": "コレクション",
  "achievements": "業績",
  "leaderboard": "ランキング",
  "missions": "ミッション",
  "attendance": "出席",
  "gacha": "ガチャ",
  "discovery": "発見",
  "materials": "素材",
  "accessories": "アクセサリー",
  "evolution": "進化",
  "season": "シーズン",
  "mail": "メール",
  "wheel": "ルーレット",
  "community": "コミュニティ",
  "mini_contents": "ミニゲーム",
  "shorts": "ショート",

  // Elements
  "element_water": "水",
  "element_fire": "火",
  "element_grass": "草",
  "element_light": "光",
  "element_dark": "闇",
  "element_ice": "氷",
  "element_electric": "電気",
  "element_poison": "毒",
  "element_earth": "大地",
  "element_wind": "風",
  "element_celestial": "天上",

  // Grades
  "grade_common": "コモン",
  "grade_uncommon": "アンコモン",
  "grade_rare": "レア",
  "grade_epic": "エピック",
  "grade_legendary": "レジェンダリー",
  "grade_mythic": "ミシック",

  // Personalities
  "personality_energetic": "活発",
  "personality_chill": "のんびり",
  "personality_foodie": "食いしん坊",
  "personality_curious": "好奇心旺盛",
  "personality_tsundere": "ツンデレ",
  "personality_gentle": "穏やか",

  // Home page buttons
  "home_attendance": "出席",
  "home_mission": "ミッション",
  "home_mailbox": "メール",
  "home_background": "背景",
  "home_codex": "図鑑",
  "home_achievements": "業績",
  "home_leaderboard": "ランク",
  "home_inventory": "持ち物",
  "home_gacha": "ガチャ",
  "home_shop": "ショップ",
  "home_bg_title": "背景変更",
  "home_bg_subtitle": "背景を選択してください",
  "home_bg_close": "閉じる",
  "home_bg_in_use": "使用中",
  "home_bg_owned": "所持",

  // Home backgrounds
  "bg_default": "デフォルト",
  "bg_sunset_meadow": "夕焼け草原",
  "bg_deep_ocean": "深海",
  "bg_cherry_blossom": "桜の庭",
  "bg_aurora": "オーロラ",
  "bg_lava_cave": "溶岩洞窟",
  "bg_crystal_cave": "水晶洞窟",
  "bg_bamboo_grove": "竹林",
  "bg_desert_mirage": "砂漠の蜃気楼",
  "bg_frozen_tundra": "凍土",
  "bg_twilight_garden": "黄昏の庭",
  "bg_thunderstorm": "雷雨",
  "bg_starlight": "星空",
  "bg_cosmic_nebula": "宇宙星雲",
  "bg_rainbow_field": "虹の野原",
  "bg_enchanted_forest": "妖精の森",
  "bg_sakura_night": "夜桜",
  "bg_underwater_temple": "海底神殿",
  "bg_blood_moon": "赤い月",
  "bg_void_realm": "混沌の領域",
  "bg_golden_palace": "黄金宮殿",
  "bg_emerald_valley": "エメラルドの谷",
  "bg_celestial_throne": "天上の玉座",
  "bg_atlantis": "アトランティス",
  "bg_dragon_realm": "龍の領域",
  "home_bg_count_suffix": "種",

  // Bottom nav extra
  "nav_mini_games": "ミニゲーム",
  "nav_collection": "収集",
  "nav_profile": "プロフィール",
  "nav_slimes": "スライム",
  "nav_more": "もっと",
  "more_title": "もっと見る",
  "more_section_content": "コンテンツ",
  "more_section_social": "ソーシャル",
  "more_section_account": "アカウント",
  "more_gacha": "ガチャ",
  "more_shop": "ショップ",
  "more_discovery": "探検",
  "more_mini": "ミニゲーム",
  "more_community": "コミュニティ",
  "more_leaderboard": "ランキング",
  "more_achievements": "実績",
  "more_codex": "図鑑",
  "more_profile": "プロフィール",
  "more_mailbox": "メール",
  "more_settings": "設定",

  // Promo banner
  "promo_ten_pull_title": "10連ガチャ OPEN!",
  "promo_ten_pull_subtitle": "10個まとめて！10%割引適用",
  "promo_ten_pull_btn": "ショップ",
  "promo_wheel_title": "毎日無料ルーレット！",
  "promo_wheel_subtitle": "今日の運試しをしよう",
  "promo_wheel_btn": "スピン",
  "promo_race_title": "スライムレース！",
  "promo_race_subtitle": "スコアを上げてランキングに挑戦",
  "promo_race_btn": "出発",
  "promo_booster_title": "ブースターで成長加速！",
  "promo_booster_subtitle": "EXP 2倍 / ゴールド 2倍 / 運UP",
  "promo_booster_btn": "購入",

  // TopBar
  "booster_gold": "ゴールド",
  "booster_luck": "運",
  "booster_default": "ブースト",
};

const zhTW: TranslationMap = {
  "profile": "個人檔案",
  "settings": "設定",
  "back": "返回",
  "level": "等級",
  "gold": "金幣",
  "gems": "寶石",
  "stardust": "星塵",
  "posts": "貼文",
  "comments": "留言",
  "tap_to_edit": "點擊編輯",
  "nickname_updated": "暱稱已更新",
  "nickname_failed": "暱稱更新失敗",

  "language": "語言設定",
  "contact": "聯繫我們",
  "terms": "服務條款",
  "privacy": "隱私政策",
  "logout": "登出",
  "logout_confirm": "確定要登出嗎？",
  "cancel": "取消",
  "confirm": "確認",

  "lang_auto": "自動（裝置設定）",
  "lang_ko": "한국어",
  "lang_en": "English",
  "lang_ja": "日本語",
  "lang_zh": "繁體中文",
  "select_language": "選擇語言",

  "contact_title": "聯繫我們",
  "contact_category": "類別",
  "contact_category_bug": "錯誤回報",
  "contact_category_suggestion": "建議",
  "contact_category_account": "帳號問題",
  "contact_category_other": "其他",
  "contact_email": "電子郵件（選填）",
  "contact_content": "內容",
  "contact_submit": "提交",
  "contact_success": "您的問題已提交",
  "contact_placeholder": "請描述您的問題...",

  "terms_title": "服務條款",
  "terms_content": `SlimeTopia 服務條款

第一條（目的）
本條款旨在規定使用SlimeTopia（以下簡稱「服務」）的條件和程序。

第二條（定義）
1.「服務」指SlimeTopia提供的所有遊戲服務。
2.「會員」指同意本條款並使用服務的人。
3.「內容」指服務中提供的所有數據。

第三條（效力）
本條款在服務畫面上公告或以其他方式通知會員後生效。

第四條（服務提供）
1. 原則上全年無休、24小時提供服務。
2. 因維護等原因，服務可能暫時中斷。

第五條（會員義務）
1. 會員必須遵守相關法律和本條款的規定。
2. 會員不得侵犯他人的權利。
3. 不得以不正當方式使用服務。`,

  "privacy_title": "隱私政策",
  "privacy_content": `SlimeTopia 隱私政策

1. 收集的個人資訊
- 社交登入時：社交帳號唯一識別碼、暱稱
- 訪客登入時：裝置識別資訊
- 使用服務時：遊戲遊玩數據、存取紀錄

2. 使用目的
- 服務提供與營運
- 會員管理與身份驗證
- 服務改善與分析

3. 保留期間
- 保留至帳號刪除為止，刪除後立即銷毀。
- 法律要求保存的資訊將在規定期間內保管。

4. 第三方提供
- 原則上不向第三方提供個人資訊。

5. 用戶權利
- 您可以隨時要求查閱、修改或刪除您的資訊。
- 聯繫方式：support@slimetopia.com`,

  "change_background": "更換背景",

  "home": "首頁",
  "inventory": "背包",
  "codex": "圖鑑",
  "merge": "合成",
  "explore": "探索",
  "shop": "商店",

  // Login page
  "login_tagline": "打造你的史萊姆王國！",
  "login_guest_start": "訪客快速開始",
  "login_guest_hint": "資料儲存在裝置上，之後可綁定電子郵件",
  "login_email_section": "電子郵件帳號",
  "login_email_btn": "電子郵件登入",
  "login_register_btn": "建立新帳號",
  "login_social_section": "社交登入",
  "login_email_title": "電子郵件登入",
  "login_register_title": "建立新帳號",
  "login_email_placeholder": "電子郵件地址",
  "login_password_placeholder": "密碼",
  "login_password_confirm_placeholder": "確認密碼",
  "login_password_hint": "密碼（至少4個字元）",
  "login_nickname_auto": "暱稱將自動生成（之後可更改）",
  "login_btn": "登入",
  "login_register_submit": "註冊",
  "login_go_back": "返回",
  "login_no_account": "沒有帳號？",
  "login_has_account": "已有帳號",
  "login_connecting": "連線中...",
  "login_logging_in": "登入中...",
  "login_registering": "註冊中...",
  "login_error_guest_fail": "訪客登入失敗。",
  "login_error_server": "無法連接伺服器。",
  "login_error_password_length": "密碼至少需要4個字元。",
  "login_error_password_mismatch": "密碼不一致。",
  "login_error_email_taken": "此電子郵件已被使用。",
  "login_error_register_fail": "註冊失敗。",
  "login_error_invalid_credentials": "電子郵件或密碼錯誤。",
  "login_error_login_fail": "登入失敗。",

  // Splash screen
  "splash_loading": "載入中...",
  "splash_tip_collect": "收集超過200種史萊姆！",
  "splash_tip_merge": "合成兩隻史萊姆發現新品種！",
  "splash_tip_explore": "派遣探險獲取稀有素材",
  "splash_tip_evolve": "透過進化樹強化史萊姆",
  "splash_tip_collection": "完成圖鑑可獲得額外獎勵！",

  // Common game UI
  "loading": "載入中...",
  "error": "錯誤",
  "ok": "確定",
  "save": "儲存",
  "delete": "刪除",
  "close": "關閉",
  "search": "搜尋",
  "empty": "空的",
  "slime": "史萊姆",
  "slimes": "史萊姆",
  "species": "種族",
  "element": "屬性",
  "grade": "稀有度",
  "personality": "個性",
  "exp": "經驗值",
  "collection": "收藏",
  "achievements": "成就",
  "leaderboard": "排行榜",
  "missions": "任務",
  "attendance": "簽到",
  "gacha": "轉蛋",
  "discovery": "發現",
  "materials": "素材",
  "accessories": "配件",
  "evolution": "進化",
  "season": "賽季",
  "mail": "郵件",
  "wheel": "輪盤",
  "community": "社群",
  "mini_contents": "小遊戲",
  "shorts": "短影片",

  // Elements
  "element_water": "水",
  "element_fire": "火",
  "element_grass": "草",
  "element_light": "光",
  "element_dark": "暗",
  "element_ice": "冰",
  "element_electric": "雷",
  "element_poison": "毒",
  "element_earth": "地",
  "element_wind": "風",
  "element_celestial": "天",

  // Grades
  "grade_common": "普通",
  "grade_uncommon": "優良",
  "grade_rare": "稀有",
  "grade_epic": "史詩",
  "grade_legendary": "傳說",
  "grade_mythic": "神話",

  // Personalities
  "personality_energetic": "活潑",
  "personality_chill": "悠閒",
  "personality_foodie": "吃貨",
  "personality_curious": "好奇",
  "personality_tsundere": "傲嬌",
  "personality_gentle": "溫柔",

  // Home page buttons
  "home_attendance": "簽到",
  "home_mission": "任務",
  "home_mailbox": "郵件",
  "home_background": "背景",
  "home_codex": "圖鑑",
  "home_achievements": "成就",
  "home_leaderboard": "排名",
  "home_inventory": "背包",
  "home_gacha": "轉蛋",
  "home_shop": "商店",
  "home_bg_title": "更換背景",
  "home_bg_subtitle": "選擇背景",
  "home_bg_close": "關閉",
  "home_bg_in_use": "使用中",
  "home_bg_owned": "已擁有",

  // Home backgrounds
  "bg_default": "預設",
  "bg_sunset_meadow": "夕陽草原",
  "bg_deep_ocean": "深海",
  "bg_cherry_blossom": "櫻花花園",
  "bg_aurora": "極光",
  "bg_lava_cave": "熔岩洞穴",
  "bg_crystal_cave": "水晶洞穴",
  "bg_bamboo_grove": "竹林",
  "bg_desert_mirage": "沙漠海市蜃樓",
  "bg_frozen_tundra": "冰原凍土",
  "bg_twilight_garden": "暮光花園",
  "bg_thunderstorm": "暴風雨",
  "bg_starlight": "星光天空",
  "bg_cosmic_nebula": "宇宙星雲",
  "bg_rainbow_field": "彩虹原野",
  "bg_enchanted_forest": "精靈森林",
  "bg_sakura_night": "夜櫻",
  "bg_underwater_temple": "海底神殿",
  "bg_blood_moon": "血月",
  "bg_void_realm": "混沌領域",
  "bg_golden_palace": "黃金宮殿",
  "bg_emerald_valley": "翡翠山谷",
  "bg_celestial_throne": "天界王座",
  "bg_atlantis": "亞特蘭提斯",
  "bg_dragon_realm": "龍之領域",
  "home_bg_count_suffix": "種",

  // Bottom nav extra
  "nav_mini_games": "小遊戲",
  "nav_collection": "收集",
  "nav_profile": "個人",
  "nav_slimes": "史萊姆",
  "nav_more": "更多",
  "more_title": "更多",
  "more_section_content": "內容",
  "more_section_social": "社交",
  "more_section_account": "帳號",
  "more_gacha": "轉蛋",
  "more_shop": "商店",
  "more_discovery": "探險",
  "more_mini": "小遊戲",
  "more_community": "社群",
  "more_leaderboard": "排行榜",
  "more_achievements": "成就",
  "more_codex": "圖鑑",
  "more_profile": "個人",
  "more_mailbox": "信箱",
  "more_settings": "設定",

  // Promo banner
  "promo_ten_pull_title": "10連抽開放！",
  "promo_ten_pull_subtitle": "10個一次抽！享9折優惠",
  "promo_ten_pull_btn": "商店",
  "promo_wheel_title": "每日免費輪盤！",
  "promo_wheel_subtitle": "試試今天的運氣吧",
  "promo_wheel_btn": "轉動",
  "promo_race_title": "史萊姆賽跑！",
  "promo_race_subtitle": "提升分數挑戰排行榜",
  "promo_race_btn": "出發",
  "promo_booster_title": "用加速器快速成長！",
  "promo_booster_subtitle": "EXP 2倍 / 金幣 2倍 / 運氣UP",
  "promo_booster_btn": "購買",

  // TopBar
  "booster_gold": "金幣",
  "booster_luck": "運氣",
  "booster_default": "加速",
};

export const translations: Record<string, TranslationMap> = {
  ko,
  en,
  ja,
  "zh-TW": zhTW,
};

export function resolveLocale(locale: Locale): string {
  if (locale !== "auto") return locale;
  if (typeof navigator === "undefined") return "ko";
  const lang = navigator.language;
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("zh")) return "zh-TW";
  return "en";
}

export function translate(locale: Locale, key: string): string {
  const resolved = resolveLocale(locale);
  return translations[resolved]?.[key] ?? translations["ko"][key] ?? key;
}
