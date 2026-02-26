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
  "inventory": "보관함",
  "codex": "도감",
  "merge": "합성",
  "explore": "탐험",
  "shop": "상점",
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
