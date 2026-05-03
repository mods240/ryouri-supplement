export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", fontFamily: "'Hiragino Sans','Meiryo',sans-serif", color: "#333", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>プライバシーポリシー</h1>
      <p style={{ color: "#888", marginBottom: 40 }}>最終更新日：2025年5月</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>1. はじめに</h2>
        <p>本アプリ「AI健康料理提案」（以下「本サービス」）は、ユーザーの体調・気分・食材情報をもとにAIがレシピを提案するサービスです。本プライバシーポリシーでは、個人情報の取り扱いについて説明します。</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>2. 収集する情報</h2>
        <p>本サービスでは以下の情報を収集します：</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>体調・症状・気分などの入力情報（AIへの送信に使用）</li>
          <li>ブラウザのローカルストレージ（お気に入り・履歴の保存）</li>
          <li>アクセスログ（Google Analyticsによる匿名の利用統計）</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>3. 情報の利用目的</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li>AIによるレシピ提案の生成</li>
          <li>サービスの改善・分析</li>
          <li>広告の表示（Google AdSense）</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>4. 第三者への提供</h2>
        <p>入力された個人情報は、レシピ生成のためにAI（Groq API）に送信されます。それ以外の第三者への販売・提供は行いません。</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>5. 医療免責事項</h2>
        <p>本サービスが提供する情報は一般的な料理・栄養の提案であり、医療的なアドバイスではありません。体調に関する判断は必ず医師にご相談ください。</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>6. Cookieと広告について</h2>
        <p>本サービスはGoogle AdSenseを使用しており、Cookieを通じてユーザーの興味に基づいた広告が表示される場合があります。広告設定はGoogleの広告設定ページから変更できます。</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>7. お問い合わせ</h2>
        <p>プライバシーポリシーに関するお問い合わせは、サービス内のお問い合わせフォームよりご連絡ください。</p>
      </section>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #eee", textAlign: "center" }}>
        <a href="/" style={{ color: "#e07b3a", textDecoration: "none", fontWeight: 700 }}>← トップページに戻る</a>
      </div>
    </div>
  );
}