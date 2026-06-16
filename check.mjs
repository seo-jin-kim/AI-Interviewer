import Database from "better-sqlite3";
const db = new Database("./dev.db", { readonly: true });

const total = db.prepare("SELECT COUNT(*) as c FROM Question").get();
console.log("total questions:", total.c);

const empty = db.prepare("SELECT COUNT(*) as c FROM Question WHERE text = '' OR text IS NULL").get();
console.log("empty questions:", empty.c);

const recent = db
  .prepare(
    `SELECT i.id, i.field, i.createdAt, COUNT(q.id) as qcount,
            SUM(CASE WHEN q.text = '' OR q.text IS NULL THEN 1 ELSE 0 END) as emptyCount
     FROM Interview i LEFT JOIN Question q ON q.interviewId = i.id
     GROUP BY i.id ORDER BY i.createdAt DESC LIMIT 8`
  )
  .all();
console.log(JSON.stringify(recent, null, 2));

db.close();
