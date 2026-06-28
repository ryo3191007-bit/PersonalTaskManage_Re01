# Playwright E2Eテスト実装結果

## 1. 実装対象
- 対象URL: https://personal-task-manage-pcx2.bolt.host/
- 元ファイル: テスト成果物/テストケース_E2E自動.md
- 実装済み: 160件
- 未実装: 0件

## 2. 参照資料
- テスト成果物/テストケース_E2E自動.md
- テスト成果物/テストケース_質問待ち.md
- テスト成果物/テスト設計.md
- README.md, FUNCTION_LIST.md, SCREEN_LIST.md
- src/pages/LoginPage.tsx, src/contexts/AuthContext.tsx, src/contexts/TaskContext.tsx

## 3. Playwright構成
- 設定ファイル: playwright.config.cjs
- テストディレクトリ: tests/e2e
- 実装ファイル: tests/e2e/personal-taskmanage.e2e.spec.cjs
- ケースデータ: tests/e2e/e2e-cases.generated.cjs
- ブラウザ: Chromium
- 追加依存: @playwright/test
- ブラウザセットアップ: playwright install chromium 実行済み
- 公開環境実行時は E2E_BASE_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD, E2E_IMPLEMENT_ALL=true を指定する。

## 4. 実装したテスト
| テストケースID | テスト名 | 実装ファイル | 対象 | テストレベル/タイプ | 仕様 | リスクID | 状態 |
|---|---|---|---|---|---|---|---|
| TC-E2E-001 | TD006 タスクの作成、再表示、編集、削除がSupabaseへ永続化されること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F101-F104、AC001-AC002 | R002 | 実装済み |
| TC-E2E-002 | TD006 タスクの作成、再表示、編集、削除がSupabaseへ永続化されること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F101-F104、AC001-AC002 | R002 | 実装済み |
| TC-E2E-003 | TD006 タスクの作成、再表示、編集、削除がSupabaseへ永続化されること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F101-F104、AC001-AC002 | R002 | 実装済み |
| TC-E2E-004 | TD006 タスクの作成、再表示、編集、削除がSupabaseへ永続化されること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F101-F104、AC001-AC002 | R002 | 実装済み |
| TC-E2E-005 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-006 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-007 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-008 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-009 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割05 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-010 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割06 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-011 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割07 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-012 | TD007 新規タスクのステータス未着手、優先度中、数量1が適用されること 分割08 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README タスク登録 | R002, R007 | 実装済み |
| TC-E2E-013 | TD008 キャンセル | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskForm、TaskContext | R002 | 実装済み |
| TC-E2E-014 | TD008 失敗 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskForm、TaskContext | R002 | 実装済み |
| TC-E2E-015 | TD008 再試行 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskForm、TaskContext | R002 | 実装済み |
| TC-E2E-016 | TD010 登録・編集・状態変更・削除が再読込後も同じ結果であること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | AC001-AC003 | R002, R012 | 実装済み |
| TC-E2E-017 | TD010 登録・編集・状態変更・削除が再読込後も同じ結果であること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | AC001-AC003 | R002, R012 | 実装済み |
| TC-E2E-018 | TD010 登録・編集・状態変更・削除が再読込後も同じ結果であること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | AC001-AC003 | R002, R012 | 実装済み |
| TC-E2E-019 | TD010 登録・編集・状態変更・削除が再読込後も同じ結果であること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | AC001-AC003 | R002, R012 | 実装済み |
| TC-E2E-020 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-021 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-022 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-023 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-024 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割05 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-025 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割06 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-026 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割07 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-027 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割08 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-028 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割09 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-029 | TD017 毎日と曜日指定で、JST暦日の期間開始日・終了日を含む対象日だけタスクを生成すること 分割10 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F301-F304、README | R004, R014 | 実装済み |
| TC-E2E-030 | TD019 曜日指定未選択、期間終了<開始、同日終了で終了<=開始を拒否すること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm | R004, R007 | 実装済み |
| TC-E2E-031 | TD019 曜日指定未選択、期間終了<開始、同日終了で終了<=開始を拒否すること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm | R004, R007 | 実装済み |
| TC-E2E-032 | TD019 曜日指定未選択、期間終了<開始、同日終了で終了<=開始を拒否すること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm | R004, R007 | 実装済み |
| TC-E2E-033 | TD019 曜日指定未選択、期間終了<開始、同日終了で終了<=開始を拒否すること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm | R004, R007 | 実装済み |
| TC-E2E-034 | TD020 翌日終了ありでは終了日を1日進め、なしでは同日内の時刻順序を保持すること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm、TaskContext | R004, R014 | 実装済み |
| TC-E2E-035 | TD020 翌日終了ありでは終了日を1日進め、なしでは同日内の時刻順序を保持すること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm、TaskContext | R004, R014 | 実装済み |
| TC-E2E-036 | TD020 翌日終了ありでは終了日を1日進め、なしでは同日内の時刻順序を保持すること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm、TaskContext | R004, R014 | 実装済み |
| TC-E2E-037 | TD020 翌日終了ありでは終了日を1日進め、なしでは同日内の時刻順序を保持すること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | RecurrenceForm、TaskContext | R004, R014 | 実装済み |
| TC-E2E-038 | TD023 日・週・月の各ビューに予定、実績、セッションがJSTで表示されること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F201-F205 | R005, R014 | 実装済み |
| TC-E2E-039 | TD023 日・週・月の各ビューに予定、実績、セッションがJSTで表示されること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F201-F205 | R005, R014 | 実装済み |
| TC-E2E-040 | TD023 日・週・月の各ビューに予定、実績、セッションがJSTで表示されること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F201-F205 | R005, R014 | 実装済み |
| TC-E2E-041 | TD025 日 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | CalendarPage | R005 | 実装済み |
| TC-E2E-042 | TD025 週 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | CalendarPage | R005 | 実装済み |
| TC-E2E-043 | TD025 月 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | CalendarPage | R005 | 実装済み |
| TC-E2E-044 | TD025 前 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | CalendarPage | R005 | 実装済み |
| TC-E2E-045 | TD025 次 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | CalendarPage | R005 | 実装済み |
| TC-E2E-046 | TD026 開始欠落 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README 未スケジュール | R005, R007 | 実装済み |
| TC-E2E-047 | TD026 終了欠落 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README 未スケジュール | R005, R007 | 実装済み |
| TC-E2E-048 | TD026 両方欠落 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README 未スケジュール | R005, R007 | 実装済み |
| TC-E2E-049 | TD026 完了 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README 未スケジュール | R005, R007 | 実装済み |
| TC-E2E-050 | TD049 CSVがBOM付きUTF-8で全タスクと選択項目を正しい列順で出力すること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README エクスポート | R009 | 実装済み |
| TC-E2E-051 | TD049 CSVがBOM付きUTF-8で全タスクと選択項目を正しい列順で出力すること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README エクスポート | R009 | 実装済み |
| TC-E2E-052 | TD049 CSVがBOM付きUTF-8で全タスクと選択項目を正しい列順で出力すること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | README エクスポート | R009 | 実装済み |
| TC-E2E-053 | TD050 日本語、カンマ、引用符、改行、絵文字をCSV/テキストで欠損なくエスケープすること 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | utils export | R009, R015 | 実装済み |
| TC-E2E-054 | TD050 日本語、カンマ、引用符、改行、絵文字をCSV/テキストで欠損なくエスケープすること 分割02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | utils export | R009, R015 | 実装済み |
| TC-E2E-055 | TD050 日本語、カンマ、引用符、改行、絵文字をCSV/テキストで欠損なくエスケープすること 分割03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | utils export | R009, R015 | 実装済み |
| TC-E2E-056 | TD050 日本語、カンマ、引用符、改行、絵文字をCSV/テキストで欠損なくエスケープすること 分割04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | utils export | R009, R015 | 実装済み |
| TC-E2E-057 | TD050 日本語、カンマ、引用符、改行、絵文字をCSV/テキストで欠損なくエスケープすること 分割05 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | utils export | R009, R015 | 実装済み |
| TC-E2E-058 | TD051 3状態 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F112、F116-F117 | R009 | 実装済み |
| TC-E2E-059 | TD051 3状態派生01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F112、F116-F117 | R009 | 実装済み |
| TC-E2E-060 | TD051 3状態派生02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | F112、F116-F117 | R009 | 実装済み |
| TC-E2E-061 | TD073 AC001のタスク登録が一覧表示と再読込後の保持まで成功すること。代表条件1件を独立判定する 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | テスト計画 AC001 | R002, R012 | 実装済み |
| TC-E2E-062 | TD074 AC002のタスク編集が表示反映と再読込後の保持まで成功すること。代表条件1件を独立判定する 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | テスト計画 AC002 | R002, R012 | 実装済み |
| TC-E2E-063 | TD075 AC003の主要状態遷移と実績情報の保存・表示が成功すること。代表条件1件を独立判定する 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | テスト計画 AC003 | R003, R007 | 実装済み |
| TC-E2E-064 | TD076 AC004のJSTカレンダー表示と日時境界が成功すること。代表条件1件を独立判定する 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | テスト計画 AC004 | R005, R014 | 実装済み |
| TC-E2E-065 | TD077 AC005の予定・実績・完了率が集計仕様と一致すること。代表条件1件を独立判定する 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | テスト計画 AC005 | R006 | 実装済み |
| TC-E2E-066 | TD078 AC006の代表設定変更が機能へ反映され、再読込後も保持されること。代表条件1件を独立判定する 分割01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | テスト計画 AC006 | R007, R011, R012 | 実装済み |
| TC-E2E-067 | TD088 単独全件＋日付 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-068 | TD088 状態 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-069 | TD088 未スケジュール | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-070 | TD088 重複0分 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-071 | TD088 1分 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-072 | TD088 1分派生01 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-073 | TD088 1分派生02 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-074 | TD088 1分派生03 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-075 | TD088 1分派生04 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-076 | TD088 1分派生05 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-077 | TD088 1分派生06 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-078 | TD088 1分派生07 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-079 | TD088 1分派生08 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-080 | TD088 1分派生09 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-081 | TD088 1分派生10 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | E2E | TaskFilters、README | R002, R007, R014 | 実装済み |
| TC-E2E-082 | TD068 S001 ログイン画面 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-083 | TD068 S101 タスク一覧画面 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-084 | TD068 S102 新規タスク作成ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-085 | TD068 S103 新規定常タスク作成ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-086 | TD068 S104 タスク編集ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-087 | TD068 S105 新しい分類を追加ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-088 | TD068 S106 開始実績時間入力ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-089 | TD068 S107 タスク中断ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-090 | TD068 S108 タスク再開ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-091 | TD068 S109 終了実績時間入力ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-092 | TD068 S110 出力項目選択ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-093 | TD068 S111 当日タスク実績レポートダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-094 | TD068 S112 タスク削除確認ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-095 | TD068 S113 定常タスク削除確認ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-096 | TD068 S114 タスク一括削除確認エリア 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-097 | TD068 S200 カレンダー画面 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-098 | TD068 S201 日カレンダータブ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-099 | TD068 S202 週カレンダータブ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-100 | TD068 S203 月カレンダータブ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-101 | TD068 S301 定常タスク管理画面 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-102 | TD068 S302 定常タスク編集ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-103 | TD068 S303 未完了タスク一括更新ダイアログ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-104 | TD068 S400 分析画面 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-105 | TD068 S401 概要分析タブ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-106 | TD068 S403 所要時間分析タブ 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-107 | TD068 S501 設定画面 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-108 | TD068 S502 アカウント情報セクション 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-109 | TD068 S503 タスク分類検索・色フィルタエリア 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-110 | TD068 S504 タスク分類一括削除確認エリア 主要経路 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-111 | TD068 F001 ログイン 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-112 | TD068 F002 サインアップ 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-113 | TD068 F101 タスク一覧表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-114 | TD068 F102 タスク作成 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-115 | TD068 F103 タスク編集 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-116 | TD068 F104 タスク削除 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-117 | TD068 F105 新しい分類追加 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-118 | TD068 F106 親子タスク設定 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-119 | TD068 F107 ステータス変更 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-120 | TD068 F108 開始実績時間入力 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-121 | TD068 F109 タスク中断時間入力 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-122 | TD068 F110 タスク再開時間入力 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-123 | TD068 F111 終了実績時間入力 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-124 | TD068 F112 テキスト出力項目選択 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-125 | TD068 F113 タスクキーワード検索 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-126 | TD068 F114 タスクフィルタ 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-127 | TD068 F115 作業負荷表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-128 | TD068 F116 CSV出力 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-129 | TD068 F117 テキスト出力 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-130 | TD068 F118 タスク一括削除 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-131 | TD068 F119 予定時刻ブラウザ通知 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-132 | TD068 F201 日カレンダー表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-133 | TD068 F202 週カレンダー表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-134 | TD068 F203 月カレンダー表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-135 | TD068 F204 前後切り替え 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-136 | TD068 F205 当日表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-137 | TD068 F206 未スケジュールタスク表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-138 | TD068 F301 定常タスク作成 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-139 | TD068 F302 定常タスク編集 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-140 | TD068 F303 定常タスク一括更新 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-141 | TD068 F304 定常タスク削除 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-142 | TD068 F401 完了率表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-143 | TD068 F402 総実績時間表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-144 | TD068 F403 ステータス分布表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-145 | TD068 F404 分類別完了タスク数表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-146 | TD068 F405 分類別実績時間表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-147 | TD068 F406 作業時間表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-148 | TD068 F410 所要時間分析 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-149 | TD068 F411 見積超過要因ランキング表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-150 | TD068 F412 見積短縮要因ランキング表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-151 | TD068 F413 表示期間切り替え 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-152 | TD068 F501 タスク分類表示 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-153 | TD068 F502 タスク分類追加 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-154 | TD068 F503 タスク分類編集 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-155 | TD068 F504 タスク分類削除 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-156 | TD068 F505 ブラウザ通知許可設定変更 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-157 | TD068 F506 タスク分類検索・色フィルタ 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-158 | TD068 F507 タスク分類一括削除 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-159 | TD068 F508 メールアドレス変更 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |
| TC-E2E-160 | TD068 F509 パスワード変更 主要機能 | tests/e2e/personal-taskmanage.e2e.spec.cjs | https://personal-task-manage-pcx2.bolt.host/ | Regression | テスト計画 10-11章、回答Q004 | R013 | 実装済み |

## 5. 未実装テストケース
- なし。
- テスト成果物/未実装テストケース_E2E自動.md は未実装0件として更新済み。

## 6. 実行結果
実行コマンド:

```powershell
$env:E2E_BASE_URL='https://personal-task-manage-pcx2.bolt.host/'
$env:E2E_IMPLEMENT_ALL='true'
$env:E2E_TEST_EMAIL='<テスト用メールアドレス>'
$env:E2E_TEST_PASSWORD='<テスト用パスワード>'
$env:E2E_RUN_ID='bolt' + (Get-Date -Format 'yyyyMMddHHmmss')
& 'C:\Users\ryo31\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\@playwright\test\cli.js test --config playwright.config.cjs --max-failures=10
```

結果:

```text
160 passed (5.6m)
```

## 7. トレーサビリティ確認
- 実装済みテスト名に全 TC-E2E-001 ～ TC-E2E-160 を含めた。
- 実装済みテスト近傍コメントに TC, TD, TV, TA, Risk, Spec の参照を含めた。
- 元E2E自動TC 160件 = 実装済み160件 + 未実装0件。
