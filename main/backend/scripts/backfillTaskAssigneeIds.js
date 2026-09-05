// One-time migration: taskProjectController.js used to match a task's
// assignee by full_name (see the "tasks matched by name, not ID" security
// fix) — two employees sharing a name could read/complete each other's
// tasks. Tasks are now matched by `assigneeId` (the real user id) instead,
// but any task created BEFORE that fix only has the old `assignee` name
// field — those tasks would otherwise vanish from every employee's "My
// Tasks" view (getTasks filters by assigneeId) the moment this deploys.
//
// This script finds every task missing assigneeId, resolves it from the
// `assignee` name against real employee-role accounts, and backfills it.
// Safe to re-run — already-migrated tasks (assigneeId already set) are
// skipped. A task whose name doesn't resolve to exactly one employee
// account (no match, or an ambiguous shared name — the exact scenario the
// original bug allowed) is left alone and listed at the end for a
// coordinator to reassign by hand via the Task Detail pane.
//
// Run with: npm run migrate:task-assignee-ids   (from main/backend)
require('dotenv').config();
const { rawCollection } = require('../config/db');

async function main() {
  const tasks = await rawCollection('tasks');
  const users = await rawCollection('users');

  const allTasks = await tasks.find({}).toArray();
  const employees = await users.find({ role: 'employee' }).toArray();

  const byName = new Map(); // full_name -> [users...] (array to detect ambiguity)
  for (const u of employees) {
    const list = byName.get(u.full_name) || [];
    list.push(u);
    byName.set(u.full_name, list);
  }

  let migrated = 0;
  let alreadyDone = 0;
  const unresolved = [];

  for (const task of allTasks) {
    if (task.assigneeId) {
      alreadyDone++;
      continue;
    }
    const matches = byName.get(task.assignee) || [];
    if (matches.length === 1) {
      await tasks.updateOne({ _id: task._id }, { $set: { assigneeId: matches[0]._id } });
      migrated++;
    } else {
      unresolved.push({
        id: task._id,
        title: task.title,
        assignee: task.assignee,
        reason: matches.length === 0 ? 'no matching employee account' : `${matches.length} employee accounts share this name`,
      });
    }
  }

  console.log(`Done. ${migrated} task(s) backfilled, ${alreadyDone} already had assigneeId, ${unresolved.length} need manual reassignment.`);
  if (unresolved.length) {
    console.log('\nReassign these by hand (open the task in the coordinator Task Detail pane and re-pick the assignee):');
    for (const t of unresolved) {
      console.log(`  - [${t.id}] "${t.title}" (was assigned to "${t.assignee}") — ${t.reason}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
