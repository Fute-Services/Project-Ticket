# Deployment Pipeline — Where Things Actually Stand

Every stage of getting Fute Portal running on `192.168.1.23`, and its real, independently-verified status right now, not what was reported, what was actually checked.

Updated 2026-09-04. Checked directly via SSH + `netstat`, not taken on report.

## Pipeline

```mermaid
flowchart TD
    A["Code migrated<br/>Firebase → MongoDB"] --> B["Real data exported<br/>48 users, 39 employees"]
    B --> C["Pushed to GitHub"]
    C --> D["Cloned onto server<br/>+ .env configured"]
    D --> E["MongoDB reachable<br/>on :27017"]
    E --> F["Replica set<br/>rs0"]
    D --> G["Backend running<br/>on :5000"]
    G --> H["Survives SSH<br/>disconnect"]
    F -.-> I["rs.initiate()"]

    classDef ok fill:#E4F5EC,stroke:#1E8E5A,color:#14361F,stroke-width:1.5px;
    classDef bad fill:#FBEAEA,stroke:#C23B3B,color:#5A1414,stroke-width:1.5px;
    classDef wait fill:#FBF0DD,stroke:#B36B00,color:#4A2E00,stroke-width:1.5px;
    class A,B,C,D ok;
    class E,F,G,H bad;
    class I wait;
```

🟢 Verified working · 🔴 Verified broken right now · 🟡 Blocked, waiting on the step before it

## Stage by stage

| Stage | Status | Note |
|---|---|---|
| Code migrated off Firebase | ✅ Done | 30 backend files, Firestore-shaped shim over MongoDB, bcrypt auth, local file storage. |
| Real data exported | ✅ Done | All 27 collections copied from the live Firebase project into MongoDB. |
| Pushed to GitHub, cloned to server | ✅ Done | `C:\fute-portal-backend`, `.env` configured with the Mongo URL and secrets. |
| MongoDB reachable | ❌ Down right now | Was working reliably for hours. As of the last check, `netstat` on the server itself shows nothing listening on `:27017`, the service isn't up. |
| Replica set (`rs0`) | ⚠️ Blocked on above | Can't run `rs.initiate()`, there's no running MongoDB to connect to yet. |
| Backend reachable on `:5000` | ❌ Down right now | Nothing listening locally on the server either. The scheduled-task/service setup hasn't actually kept it running. |
| Survives SSH disconnect | ⚠️ Blocked on above | Can't verify persistence until the backend is actually up in the first place. |
