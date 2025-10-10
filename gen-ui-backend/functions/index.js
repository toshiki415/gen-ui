// index.js (v2 SDK対応版)

// v2のhttpsモジュールからonRequestをインポート
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();
const db = admin.firestore();

/**
 * 履歴の取得 (GET) と保存 (POST) を行うHTTPトリガー関数 (v2)
 */
exports.history = onRequest(
    // リージョンやメモリなどのオプションをオブジェクトで指定
    {
      region: "asia-northeast1",
      memory: "256MiB", // メモリ指定（任意）
    },
    async (req, res) => {
      // CORSミドルウェアを実行して、クロスドメインリクエストを許可
      cors(req, res, async () => {
        const historiesRef = db.collection("histories");

        // GETリクエスト: 履歴の一覧を返す
        if (req.method === "GET") {
          try {
            const snapshot = await historiesRef.orderBy("createdAt", "desc")
                .limit(30).get();
            const histories = snapshot.docs.map((doc) => ({
              id: doc.id, ...doc.data(),
            }));
            res.status(200).json(histories);
          } catch (error) {
            console.error("履歴の取得に失敗しました:", error);
            res.status(500).send("Internal Server Error");
          }
        // POSTリクエスト: 新しい履歴を保存する
        } else if (req.method === "POST") {
          try {
            const {
              requestPrompt,
              originalHtml,
              generatedHtml,
              generatedCss,
            } = req.body;

            if (!requestPrompt || !originalHtml || !generatedHtml ||
              !generatedCss) {
              return res.status(400).send("必須フィールドが不足しています。");
            }
            const newHistory = {
              requestPrompt,
              originalHtml,
              generatedHtml,
              generatedCss,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            const docRef = await historiesRef.add(newHistory);
            res.status(201).json({id: docRef.id, ...newHistory});
          } catch (error) {
            console.error("履歴の保存に失敗しました:", error);
            res.status(500).send("Internal Server Error");
          }
        // その他のメソッドは許可しない
        } else {
          res.setHeader("Allow", ["GET", "POST"]);
          res.status(405).send("Method Not Allowed");
        }
      });
    });
